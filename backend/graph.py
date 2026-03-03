"""
backend/graph.py - Complete LangGraph visualization pipeline from model3.ipynb
Async-compatible for FastAPI. Saves images to 'outputs/' folder.
"""

import os
import uuid
import json
import base64
import re
import requests
from typing import TypedDict, List, Dict, Any, Literal
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt
from graphviz import Digraph
from pydantic import BaseModel, Field
from openai import AsyncOpenAI
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from graphviz import Digraph, Graph
from openai import AsyncOpenAI, OpenAI

load_dotenv()

MODEL_NAME = "gpt-4o-mini"

openai_client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

os.makedirs("outputs", exist_ok=True)  # Updated to available model (gpt-5-mini not real)



# Models (from notebook)
class GraphState(TypedDict):
    text: str
    analysis: Dict[str, Any]
    outputs: List[Dict[str, Any]]

class VisualizationSpec(BaseModel):
    type: Literal["matplotlib", "graphviz", "diffusion"]
    title: str
    description: str
    data: Dict[str, Any] = Field(default_factory=dict)
    prompt: str = ""

    def validate_data(self):
        if self.type == "matplotlib":
            if not self.data.get("x") or not self.data.get("y"):
                raise ValueError(f"Matplotlib spec '{self.title}' missing x or y data")
        if self.type == "graphviz":
            if not self.data.get("nodes") or not self.data.get("edges"):
                raise ValueError(f"Graphviz spec '{self.title}' missing nodes or edges")
        if self.type == "diffusion":
            if not self.prompt:
                raise ValueError(f"Diffusion spec '{self.title}' missing prompt")

class AnalysisOutput(BaseModel):
    summary: str
    visualizations: List[VisualizationSpec] = Field(default_factory=list)

# Planner Node (from notebook, sync → async)
async def planner_node(state: GraphState):
    text = state["text"]
    system_prompt = """You are a visualization planner, you read the text and decide what visualizations to create.
Basically you are a information representer, you read the text and decide how to represent the information in the best way possible way generating images. You can use matplotlib for data, graphviz for flows/trees/pipelines, and diffusion for conceptual identification. You generate a JSON output.
You are master of these libraries and know how to use them (matplotlib, graphviz) and you decide best suitable visualization among the available visualiations in those libraries(like graphs, bar charts, histograms, heatmaps etc..) based on the text. 

Not all type (matplot, graphviz, diffusion) of visualizations are needed to be used all the times, you can decide it based on the suitability.

Your main task is to represent entire information into images, so you need to decide best suitable visualization type and generate data for it. You also need to add a summary of the text in the output in about 3-8 sentences based on the text. You can use multiple visualizations if needed.
Return STRICT JSON only.

You need to make sure that visualizations are strictly based on only the information/text provided and not on any external information or your knowledge.
You also need to make sure that entire information is represented into visuals and nothing is left out.
MANDATORY RULES:

If type is matplotlib:
- data MUST include:
 - chart_type
 - x (array)
 - y (array)

If type is graphviz (flows/trees/pipelines):
- data MUST include: nodes (array of strings or [{'id':str, 'attrs':{shape:'ellipse', color:'red'}}]), edges (array of [from,to] or [{'from':str, 'to':str, 'attrs':{label:'step1', color:'green'}}])
- Optional: graph_type ('digraph'), clusters ({'Models': ['node1','node2']}), node_attrs/shape/color, edge_attrs/label


If conceptual:
- use diffusion with a detailed prompt, generate .png based images

Never leave data empty.

Schema:
{
 "summary": "...",
 "visualizations": [
 {
 "type": "matplotlib | graphviz | diffusion",
 "title": "...",
 "description": "...",
 "data": {...},
 "prompt": "..."
 }
 ]
}
MANDATORY RULES:

For matplotlib (best for data):
- data MUST include: chart_type ('line', 'bar', 'scatter', 'hist', 'box', 'pie', 'heatmap', 'area', 'violin', 'stacked_bar', etc.), x (array), y (array)
- Add detailed 'prompt' for styling (e.g., "highlight anomalies in red")

For graphviz (flows/trees): [keep existing]

Never leave data empty. LLM decides best type based on text (e.g., time-series → line/hist; categories → bar/pie; networks → graphviz)."""

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
    )

    content = response.choices[0].message.content
    # Robust JSON extraction & cleaning
    content = re.sub(r'```json|```', '', content.strip())  # Remove markdown fences
    content = re.sub(r'//.*', '', content)  # Remove comments
    if '{' in content and '}' in content:
        content = '{' + content.split('{', 1)[-1].rsplit('}', 1)[0] + '}'  # Extract JSON block

    try:
        parsed_dict = json.loads(content)
        parsed = AnalysisOutput.model_validate(parsed_dict)
    except Exception as e:
        print(f"JSON parse failed: {e}")
        print("Raw LLM output:", content[:500])
        # Fallback minimal output
        parsed = AnalysisOutput(
            summary="Fallback summary: visualization planning failed.",
            visualizations=[]
        )

    print("DEBUG Planner Output:")
    print(parsed.model_dump_json(indent=2))

    return {"analysis": parsed.model_dump()}

# Visualization Adapters (fixed from notebook errors)
def matplotlib_adapter(spec: VisualizationSpec):
    spec.validate_data()
    data = spec.data
    x = data.get('x', [])
    y = data.get('y', [])
    chart_type = data.get('chart_type', 'line').lower()
    prompt = spec.prompt

    plt.figure(figsize=(10, 6))
    try:
        if chart_type == 'bar':
            plt.bar(x, y)
        elif chart_type == 'scatter':
            plt.scatter(x, y)
        elif chart_type == 'line':
            plt.plot(x, y)
        elif chart_type in ['histogram', 'hist']:
            if x:
                plt.hist(x, bins=10)
            else:
                raise ValueError("Histogram needs 'x' data")
        elif chart_type in ['box', 'boxplot']:
            plt.boxplot(y)
        elif chart_type == 'pie':
            plt.pie(y, labels=x)
        elif chart_type == 'heatmap':
            import numpy as np
            matrix = np.array(y).reshape(int(len(y)**0.5), -1) if y else np.random.rand(10,10)
            plt.imshow(matrix, cmap='hot')
            plt.colorbar()
        elif chart_type == 'area':
            plt.fill_between(x, y)
        elif chart_type == 'violin':
            plt.violinplot(y)
        elif chart_type in ['stacked_area', 'stackedarea']:
            if isinstance(y, dict) and 'series_values' in y:
                series_data = y['series_values']
            elif isinstance(y[0] if y else [], list):
                series_data = y
            else:
                series_data = [y]
            plt.stackplot(x, *series_data, labels=y.get('series_labels', ['Series']))
            plt.legend()
        elif chart_type == 'stacked_bar':
            plt.bar(x, y[0] if y else [], label='A')
            if len(y) > 1:
                plt.bar(x, y[1], bottom=y[0], label='B')
        else:
            plt.plot(x, y)  # Fallback

        plt.title(spec.title)
        plt.xlabel('X')
        plt.ylabel('Y')
        plt.grid(True)
        if 'label' in data:
            plt.legend()

        if 'red' in prompt.lower():
            plt.scatter(x[::5], y[::5], color='red', zorder=5)
        plt.tight_layout()

    except Exception as e:
        print(f"Chart error: {e}")
        plt.text(0.5, 0.5, f'Error rendering {chart_type}', ha='center', va='center', transform=plt.gca().transAxes)

    filename = f"{spec.title.replace(' ', '_')}_{uuid.uuid4().hex[:6]}.png"
    path = os.path.join("outputs", filename)
    plt.savefig(path, bbox_inches='tight', dpi=150)
    plt.close()
    print(f"Matplotlib ({chart_type}) saved → {path}")
    return path

def graphviz_adapter(spec: VisualizationSpec):
    spec.validate_data()
    data = spec.data
    nodes = data.get('nodes', [])
    edges = data.get('edges', [])
    graph_type = data.get('graph_type', 'digraph').lower()
    prompt = spec.prompt.lower()

    if graph_type == 'graph':
        graph = Graph(comment=spec.title)
    else:
        graph = Digraph(comment=spec.title)

    graph.attr(rankdir='TB' if 'vertical' in prompt else 'LR')
    graph.attr('node', shape='box', style='filled', fillcolor='lightblue', fontsize='10')
    graph.attr('edge', color='darkblue', fontsize='9')

    # Clusters
    clusters = data.get('clusters', {})
    for cluster_id, cluster_nodes in clusters.items():
        safe_cluster = re.sub(r'[^a-zA-Z0-9_-]', '_', str(cluster_id))[:20]
        with graph.subgraph(name=f'cluster_{safe_cluster}') as c:
            c.attr(label=cluster_id, style='filled', color='lightgrey')
            for node in cluster_nodes:
                safe_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(node))[:30]
                c.node(safe_node, fillcolor='white')

    # Nodes
    default_node_attrs = data.get('node_attrs', {'shape':'box', 'style':'filled'})
    for node_data in nodes:
        if isinstance(node_data, str):
            node_id = re.sub(r'[^a-zA-Z0-9_ -]', '_', node_data)[:50]
            graph.node(node_id, **default_node_attrs)
        else:
            node_id = re.sub(r'[^a-zA-Z0-9_-]', '_', str(node_data.get('id', '')))[:30]
            node_attrs = {**default_node_attrs, **node_data.get('attrs', {})}
            if 'color' in node_attrs and 'fillcolor' not in node_attrs:
                node_attrs['fillcolor'] = node_attrs['color']
            graph.node(node_id, **node_attrs)

    # Edges
    default_edge_attrs = data.get('edge_attrs', {})
    for edge_data in edges:
        if isinstance(edge_data, list) and len(edge_data) == 2:
            from_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(edge_data[0]))[:30]
            to_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(edge_data[1]))[:30]
            graph.edge(from_node, to_node, **default_edge_attrs)
        else:
            from_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(edge_data.get('from', '')))[:30]
            to_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(edge_data.get('to', '')))[:30]
            edge_attrs = {**default_edge_attrs, **edge_data.get('attrs', {})}
            graph.edge(from_node, to_node, **edge_attrs)

    safe_title = re.sub(r'[^a-zA-Z0-9]', '_', spec.title)[:40]
    safe_uuid = uuid.uuid4().hex[:6]
    filename = f"{safe_title}_{safe_uuid}"
    path = os.path.join("outputs", filename)

    try:
        graph.render(path, format='png', cleanup=True)
        full_path = f"{path}.png"
        print(f"Graphviz ({graph_type}, {len(nodes)} nodes, clusters:{len(clusters)}) saved → {full_path}")
        return full_path
    except Exception as e:
        print(f"Graphviz render failed: {e}")
        fallback_path = os.path.join("outputs", f"fallback_{safe_uuid}.png")
        return fallback_path

async def diffusion_adapter(spec: VisualizationSpec, openai_client: AsyncOpenAI):
    spec.validate_data()

    safe_title = re.sub(r'[^a-zA-Z0-9]', '_', spec.title)[:40]
    safe_uuid = uuid.uuid4().hex[:6]
    filename = f"{safe_title}_{safe_uuid}.png"
    path = os.path.join("outputs", filename)

    import asyncio
    loop = asyncio.get_event_loop()

    try:
        result = await (openai_client.images.generate(
            model="dall-e-3",
            prompt=spec.prompt[:1000],
            size="1024x1024",
            n=1
        ))
        print(f"DALL-E response: {result.data[0] if result.data else 'No data'}")

        if result.data and result.data[0].b64_json:
            image_bytes = base64.b64decode(result.data[0].b64_json)
        elif result.data and result.data[0].url:
            resp = requests.get(result.data[0].url)
            resp.raise_for_status()
            image_bytes = resp.content
        else:
            raise ValueError("No image data or URL")

        if len(image_bytes) < 500:
            raise ValueError(f"Image too small: {len(image_bytes)} bytes")

    except Exception as e:
        print(f"DALL-E ERROR: {e}")
        # PLACEHOLDER IMAGE
        plt.figure(figsize=(12, 8))
        plt.imshow([[0.2,0.4],[0.6,0.8]], cmap='plasma', extent=[0,10,0,10])
        plt.title(f"Conceptual: {spec.title}", fontsize=16, pad=20)
        plt.axis('off')
        plt.savefig(path, bbox_inches='tight', dpi=150, facecolor='black')
        plt.close()
        print(f"Diffusion placeholder → {path}")
        return path

    # SAVE
    with open(path, 'wb') as f:
        f.write(image_bytes)
    print(f"Diffusion SUCCESS → {path} ({len(image_bytes)//1000}KB)")
    return path

# Router (fixed dict error: use model_dump())
async def visualization_router(state: GraphState):
    analysis_dict = state["analysis"]
    analysis = AnalysisOutput.model_validate(analysis_dict)

    outputs = []
    for spec in analysis.visualizations:
        try:
            if spec.type == "matplotlib":
                path = matplotlib_adapter(spec)
            elif spec.type == "graphviz":
                path = graphviz_adapter(spec)
            elif spec.type == "diffusion":
                path = await diffusion_adapter(spec, openai_client)  # Handle async in main
            else:
                continue

            outputs.append({
                "title": spec.title,
                "type": spec.type,
                "path": path,
            })
        except Exception as e:
            print(f"Visualization failed: {spec.title}")
            print("Error:", e)

    return {"outputs": outputs}

# Decision nodes (unchanged)
def decision_node(state: GraphState):
    return {}

def route_decision(state: GraphState):
    analysis_dict = state["analysis"]
    analysis = AnalysisOutput.model_validate(analysis_dict)

    if not analysis.visualizations:
        return END

    first_type = analysis.visualizations[0].type
    if first_type in ["matplotlib", "graphviz", "diffusion"]:
        return "visualize"
    return END

# Build Graph
builder = StateGraph(GraphState)
builder.add_node("planner", planner_node)
builder.add_node("decision", decision_node)
builder.add_node("visualize", visualization_router)

builder.set_entry_point("planner")
builder.add_edge("planner", "decision")
builder.add_conditional_edges(
    "decision",
    route_decision,
    {
        "visualize": "visualize",
        END: END
    },
)
builder.add_edge("visualize", END)

app = builder.compile()

# Public async runner for FastAPI
async def run_graph(text: str):
    result = await app.ainvoke({"text": text, "analysis": {}, "outputs": []})

    analysis = result.get("analysis", {})
    outputs = result.get("outputs", [])

    return {
        "summary": analysis.get("summary", ""),
        "outputs": outputs
    }

