"""
backend/graph.py - Complete LangGraph visualization pipeline
Async-compatible for FastAPI. Saves premium-quality images to 'outputs/' folder.
"""

import os
import uuid
import json
import base64
import re
import requests
from typing import TypedDict, List, Dict, Any, Literal
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib import patheffects
from graphviz import Digraph, Graph
from pydantic import BaseModel, Field
from openai import AsyncOpenAI
from dotenv import load_dotenv
from pathlib import Path
from langgraph.graph import StateGraph, END

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

MODEL_NAME = "gpt-4o-mini"

openai_client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

os.makedirs("outputs", exist_ok=True)

# =================== PREMIUM COLOR PALETTES ===================
PALETTE = {
    "bg_dark": "#0f172a",
    "bg_card": "#1e293b",
    "text_primary": "#f8fafc",
    "text_secondary": "#94a3b8",
    "grid": "#334155",
    "accent_blue": "#38bdf8",
    "accent_cyan": "#22d3ee",
    "accent_violet": "#a78bfa",
    "accent_rose": "#fb7185",
    "accent_amber": "#fbbf24",
    "accent_emerald": "#34d399",
    "accent_orange": "#fb923c",
    "accent_pink": "#f472b6",
}

CHART_COLORS = [
    "#38bdf8", "#a78bfa", "#fb7185", "#34d399", "#fbbf24",
    "#22d3ee", "#fb923c", "#f472b6", "#818cf8", "#4ade80",
    "#e879f9", "#f97316", "#06b6d4", "#8b5cf6", "#ef4444",
]

def _setup_premium_style():
    """Apply premium dark theme to matplotlib."""
    plt.rcParams.update({
        'figure.facecolor': PALETTE["bg_dark"],
        'axes.facecolor': PALETTE["bg_card"],
        'axes.edgecolor': PALETTE["grid"],
        'axes.labelcolor': PALETTE["text_primary"],
        'axes.titlesize': 16,
        'axes.titleweight': 'bold',
        'axes.labelsize': 12,
        'axes.grid': True,
        'grid.color': PALETTE["grid"],
        'grid.alpha': 0.3,
        'grid.linestyle': '--',
        'text.color': PALETTE["text_primary"],
        'xtick.color': PALETTE["text_secondary"],
        'ytick.color': PALETTE["text_secondary"],
        'xtick.labelsize': 10,
        'ytick.labelsize': 10,
        'legend.facecolor': PALETTE["bg_card"],
        'legend.edgecolor': PALETTE["grid"],
        'legend.fontsize': 10,
        'font.family': 'sans-serif',
        'font.sans-serif': ['Segoe UI', 'Arial', 'Helvetica', 'DejaVu Sans'],
        'figure.dpi': 150,
        'savefig.dpi': 200,
        'savefig.bbox': 'tight',
        'savefig.pad_inches': 0.3,
    })


# =================== MODELS ===================
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


# =================== PLANNER NODE ===================
async def planner_node(state: GraphState):
    text = state["text"] if state.get("text") else ""
    system_prompt = """You are an expert visualization planner and data storyteller. You read text and create stunning, informative visual representations.

You can use:
- **matplotlib** for quantitative data (charts, graphs, plots)
- **graphviz** for relationships, flows, timelines, hierarchies, pipelines
- **diffusion** for conceptual/artistic illustrations

IMPORTANT GUIDELINES:
1. Choose the BEST visualization type for each piece of information
2. Not all types need to be used every time — pick what fits best
3. Ensure ALL key information from the text is represented visually
4. Generate data ONLY from the provided text, never from external knowledge
5. Try to include at least one graphviz diagram if the content has any flow, process, or relationship

SUMMARY RULES:
- Provide a DETAILED, INSIGHTFUL bullet-point summary with 5-12 key takeaways
- Each point must be crisp but INFORMATIVE (max 20 words per point)
- Highlight trends, anomalies, or important patterns
- Summarize key facts, do NOT just list topics — give actual insights
- Use simple, direct language. Avoid filler words
- Place the summary INSIDE the "summary" field using \\n and - for formatting
- Do NOT output summary outside the JSON block

Return STRICT JSON only.

MANDATORY DATA RULES:

For matplotlib:
- data MUST include:
  - chart_type: one of 'line', 'bar', 'horizontal_bar', 'pie', 'donut', 'scatter', 'heatmap', 'area', 'radar', 'stacked_bar'
  - x: array of strings or numbers (for pie/donut: wedge labels)
  - y: array of NUMBERS only (for pie/donut: sizes; for heatmap: 1D array for matrix)
  - Optional: x_label, y_label, label, colors (array of hex colors)
- ALWAYS generate at least 5-8 data points from the text for richer charts
- For bar/line/pie: pick the MOST SIGNIFICANT quantitative values from data
- If text has no explicit numbers, estimate relative proportions from qualitative importance

For graphviz:
- data MUST include: 
  - nodes: array of strings OR array of objects with {id, attrs: {shape, color, label}}
  - edges: array of [from, to] OR array of {from, to, attrs: {label, color}}
  - Optional: graph_type ('digraph' or 'graph'), clusters ({name: [nodes]}), node_attrs, edge_attrs
- For timelines/horizontal flows: set prompt to "horizontal"
- Add cluster groupings whenever there are logical categories of nodes

For diffusion:
- prompt MUST be detailed and descriptive for image generation
- Describe the scene, style, colors, mood in detail

Schema:
{
  "summary": "- Point 1\\n- Point 2\\n...",
  "visualizations": [
    {
      "type": "matplotlib | graphviz | diffusion",
      "title": "Clear, descriptive title",
      "description": "What this visualization shows",
      "data": {...},
      "prompt": "styling hints or diffusion prompt"
    }
  ]
}

For maximum quality: Generate 2-4 diverse visualizations. Prefer matplotlib for quantities and graphviz for relationships. Never leave data empty."""

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
        response_format={"type": "json_object"},
        max_tokens=4096,
        temperature=0.3,  # Lower temperature = more consistent, reliable JSON
    )

    content = response.choices[0].message.content
    # Robust JSON extraction & cleaning
    content = re.sub(r'```json|```', '', content.strip())
    content = re.sub(r'//.*', '', content)
    if '{' in content and '}' in content:
        content = '{' + content.split('{', 1)[-1].rsplit('}', 1)[0] + '}'

    try:
        parsed_dict = json.loads(content)
        parsed = AnalysisOutput.model_validate(parsed_dict)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"JSON parse failed: {e}\n{error_details}")
        print("Raw LLM output:", content[:500])
        parsed = AnalysisOutput(
            summary=f"Fallback summary: visualization planning failed. Error: {str(e)}",
            visualizations=[]
        )

    print("DEBUG Planner Output:")
    print(parsed.model_dump_json(indent=2))

    return {"analysis": parsed.model_dump()}


# =================== PREMIUM MATPLOTLIB ADAPTER ===================
def matplotlib_adapter(spec: VisualizationSpec):
    spec.validate_data()
    _setup_premium_style()

    data = spec.data
    x = data.get('x', [])
    y = data.get('y', [])

    # Ensure y values are numeric
    try:
        if isinstance(y, list) and len(y) > 0:
            y = [float(v) if str(v).replace('.','',1).replace('-','',1).isdigit() else v for v in y]
    except Exception:
        pass

    chart_type = data.get('chart_type', 'line').lower()
    prompt = spec.prompt or ""
    custom_colors = data.get('colors', None)
    colors = custom_colors if custom_colors else CHART_COLORS

    fig, ax = plt.subplots(figsize=(12, 7))

    try:
        if chart_type == 'bar':
            bars = ax.bar(x, y, color=colors[:len(x)], width=0.6, edgecolor='none',
                         zorder=3, alpha=0.9)
            # Add value labels on top
            for bar, val in zip(bars, y):
                ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + max(y)*0.02,
                       f'{val:,.1f}' if isinstance(val, float) else f'{val:,}',
                       ha='center', va='bottom', fontsize=9, fontweight='bold',
                       color=PALETTE["text_primary"])
            # Add subtle gradient effect
            for bar, c in zip(bars, colors[:len(x)]):
                bar.set_alpha(0.85)
            ax.set_axisbelow(True)

        elif chart_type == 'horizontal_bar':
            bars = ax.barh(x, y, color=colors[:len(x)], height=0.6, edgecolor='none',
                          zorder=3, alpha=0.9)
            for bar, val in zip(bars, y):
                ax.text(bar.get_width() + max(y)*0.02, bar.get_y() + bar.get_height()/2.,
                       f'{val:,.1f}' if isinstance(val, float) else f'{val:,}',
                       ha='left', va='center', fontsize=9, fontweight='bold',
                       color=PALETTE["text_primary"])

        elif chart_type == 'scatter':
            scatter = ax.scatter(x, y, c=colors[0], s=80, alpha=0.8, edgecolors='white',
                                linewidth=0.5, zorder=3)

        elif chart_type == 'line':
            ax.plot(x, y, color=colors[0], linewidth=2.5, marker='o', markersize=6,
                   markerfacecolor='white', markeredgecolor=colors[0], markeredgewidth=2,
                   zorder=3, alpha=0.9)
            # Fill area under line
            ax.fill_between(range(len(x)) if not all(isinstance(v, (int, float)) for v in x) else x,
                           y, alpha=0.1, color=colors[0])
            if not all(isinstance(v, (int, float)) for v in x):
                ax.set_xticks(range(len(x)))
                ax.set_xticklabels(x, rotation=45, ha='right')

        elif chart_type in ['histogram', 'hist']:
            ax.hist(x if x else y, bins=min(15, len(x) if x else 10),
                   color=colors[0], edgecolor=PALETTE["bg_dark"], alpha=0.85, zorder=3)

        elif chart_type in ['box', 'boxplot']:
            bp = ax.boxplot(y, patch_artist=True, widths=0.5,
                           boxprops=dict(facecolor=colors[0], alpha=0.7),
                           medianprops=dict(color=PALETTE["accent_amber"], linewidth=2),
                           whiskerprops=dict(color=PALETTE["text_secondary"]),
                           capprops=dict(color=PALETTE["text_secondary"]),
                           flierprops=dict(markerfacecolor=PALETTE["accent_rose"], markersize=6))

        elif chart_type in ['pie', 'donut']:
            # Premium pie/donut chart
            fig_pie, ax_pie = plt.subplots(figsize=(10, 10))
            ax_pie.set_facecolor(PALETTE["bg_dark"])
            fig_pie.set_facecolor(PALETTE["bg_dark"])

            wedge_colors = colors[:len(x)]
            explode = [0.03] * len(x)

            wedges, texts, autotexts = ax_pie.pie(
                y, labels=None, autopct='%1.1f%%', startangle=90,
                colors=wedge_colors, explode=explode,
                pctdistance=0.8 if chart_type == 'donut' else 0.6,
                wedgeprops=dict(width=0.55 if chart_type == 'donut' else 1,
                               edgecolor=PALETTE["bg_dark"], linewidth=2)
            )
            for t in autotexts:
                t.set_color(PALETTE["text_primary"])
                t.set_fontsize(10)
                t.set_fontweight('bold')

            ax_pie.legend(wedges, x, loc='lower center', ncol=min(4, len(x)),
                         fontsize=9, frameon=True, fancybox=True,
                         facecolor=PALETTE["bg_card"], edgecolor=PALETTE["grid"],
                         labelcolor=PALETTE["text_primary"],
                         bbox_to_anchor=(0.5, -0.05))

            ax_pie.set_title(spec.title, fontsize=18, fontweight='bold',
                            color=PALETTE["text_primary"], pad=20)

            plt.close(fig)  # Close the original figure
            fig = fig_pie
            ax = ax_pie

        elif chart_type == 'heatmap':
            if not y:
                matrix = np.random.rand(10, 10)
            else:
                elements = len(y)
                cols = len(x) if x and len(x) > 0 else int(elements**0.5)
                if cols > 0 and elements % cols != 0:
                    for i in range(int(elements**0.5), 0, -1):
                        if elements % i == 0:
                            cols = elements // i
                            break
                rows = elements // cols if cols > 0 else 0
                try:
                    matrix = np.array(y).reshape(rows, cols)
                except ValueError:
                    dim = int(elements**0.5)
                    matrix = np.array(y[:dim*dim]).reshape(dim, dim)

            im = ax.imshow(matrix, cmap='magma', aspect='auto', interpolation='nearest')
            if x and len(x) == matrix.shape[1]:
                ax.set_xticks(range(len(x)))
                ax.set_xticklabels(x, rotation=45, ha='right')
            cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
            cbar.ax.yaxis.set_tick_params(color=PALETTE["text_secondary"])
            cbar.outline.set_edgecolor(PALETTE["grid"])
            plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color=PALETTE["text_secondary"])

        elif chart_type == 'area':
            ax.fill_between(range(len(x)) if not all(isinstance(v, (int, float)) for v in x) else x,
                           y, alpha=0.3, color=colors[0])
            ax.plot(range(len(x)) if not all(isinstance(v, (int, float)) for v in x) else x,
                   y, color=colors[0], linewidth=2, zorder=3)
            if not all(isinstance(v, (int, float)) for v in x):
                ax.set_xticks(range(len(x)))
                ax.set_xticklabels(x, rotation=45, ha='right')

        elif chart_type == 'violin':
            parts = ax.violinplot(y, showmeans=True, showmedians=True)
            for pc in parts.get('bodies', []):
                pc.set_facecolor(colors[0])
                pc.set_alpha(0.7)

        elif chart_type == 'stacked_bar':
            if isinstance(y, list) and len(y) > 0 and isinstance(y[0], list):
                bottom = np.zeros(len(x))
                for i, series in enumerate(y):
                    ax.bar(x, series, bottom=bottom, color=colors[i % len(colors)],
                          alpha=0.85, label=f'Series {i+1}', edgecolor='none', zorder=3)
                    bottom += np.array(series)
                ax.legend()
            else:
                ax.bar(x, y, color=colors[0], alpha=0.85, edgecolor='none', zorder=3)

        elif chart_type == 'radar':
            fig_r, ax_r = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))
            fig_r.set_facecolor(PALETTE["bg_dark"])
            ax_r.set_facecolor(PALETTE["bg_card"])
            
            angles = np.linspace(0, 2 * np.pi, len(x), endpoint=False).tolist()
            values = y + [y[0]]
            angles += angles[:1]
            
            ax_r.plot(angles, values, color=colors[0], linewidth=2, zorder=3)
            ax_r.fill(angles, values, color=colors[0], alpha=0.2)
            ax_r.set_xticks(angles[:-1])
            ax_r.set_xticklabels(x, color=PALETTE["text_primary"], fontsize=10)
            ax_r.set_title(spec.title, fontsize=18, fontweight='bold',
                          color=PALETTE["text_primary"], pad=30)
            ax_r.grid(color=PALETTE["grid"], alpha=0.3)
            ax_r.spines['polar'].set_color(PALETTE["grid"])
            ax_r.tick_params(colors=PALETTE["text_secondary"])
            
            plt.close(fig)
            fig = fig_r
            ax = ax_r

        else:
            ax.plot(x, y, color=colors[0], linewidth=2.5, marker='o', markersize=5,
                   zorder=3, alpha=0.9)

        # Apply title and labels (skip for pie/donut/radar which handle their own)
        if chart_type not in ['pie', 'donut', 'radar']:
            ax.set_title(spec.title, fontsize=16, fontweight='bold',
                        color=PALETTE["text_primary"], pad=15,
                        path_effects=[patheffects.withStroke(linewidth=0, foreground='black')])
            ax.set_xlabel(data.get('x_label', ''), fontsize=12, color=PALETTE["text_secondary"], labelpad=10)
            ax.set_ylabel(data.get('y_label', ''), fontsize=12, color=PALETTE["text_secondary"], labelpad=10)

            # Rotate x labels if they're strings and numerous
            if isinstance(x, list) and len(x) > 5 and all(isinstance(v, str) for v in x):
                plt.setp(ax.get_xticklabels(), rotation=45, ha='right')

            # Remove top and right spines for cleaner look
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.spines['left'].set_color(PALETTE["grid"])
            ax.spines['bottom'].set_color(PALETTE["grid"])

        # Add watermark
        fig.text(0.99, 0.01, 'DivyaDhrishti', fontsize=8, color=PALETTE["text_secondary"],
                alpha=0.4, ha='right', va='bottom', style='italic')

        fig.tight_layout()

    except Exception as e:
        print(f"Chart error ({chart_type}): {e}")
        import traceback
        traceback.print_exc()
        ax.text(0.5, 0.5, f'Error rendering {chart_type}\n{str(e)[:80]}',
               ha='center', va='center', transform=ax.transAxes,
               color=PALETTE["accent_rose"], fontsize=12)

    safe_title = re.sub(r'[^a-zA-Z0-9]', '_', spec.title)[:40]
    filename = f"{safe_title}_{uuid.uuid4().hex[:6]}.png"
    path = os.path.join("outputs", filename)

    try:
        fig.savefig(path, bbox_inches='tight', dpi=200,
                   facecolor=fig.get_facecolor(), edgecolor='none')
    except Exception as save_err:
        print(f"Failed to save matplotlib image: {save_err}")
    finally:
        plt.close(fig)

    print(f"Matplotlib ({chart_type}) saved → {path}")
    return path


# =================== PREMIUM GRAPHVIZ ADAPTER ===================
# Modern color scheme for graphviz nodes
GV_NODE_COLORS = [
    "#38bdf8", "#a78bfa", "#fb7185", "#34d399", "#fbbf24",
    "#22d3ee", "#fb923c", "#f472b6",
]

def graphviz_adapter(spec: VisualizationSpec):
    spec.validate_data()
    data = spec.data
    nodes = data.get('nodes', [])
    edges = data.get('edges', [])
    graph_type = data.get('graph_type', 'digraph').lower()
    prompt = (spec.prompt or "").lower()

    if graph_type == 'graph':
        graph = Graph(comment=spec.title)
    else:
        graph = Digraph(comment=spec.title)

    # Premium graph attributes
    graph.attr(
        rankdir='LR' if 'horizontal' in prompt else 'TB',
        bgcolor='#0f172a',
        pad='0.5',
        nodesep='0.8',
        ranksep='1.0',
        dpi='200',
        label=f'<<FONT COLOR="#f8fafc" POINT-SIZE="20"><B>{spec.title}</B></FONT>>',
        labelloc='t',
        labeljust='c',
        fontname='Segoe UI',
    )

    # Premium node defaults
    graph.attr('node',
        shape='box',
        style='filled,rounded',
        fillcolor='#1e293b',
        color='#334155',
        fontcolor='#f8fafc',
        fontsize='11',
        fontname='Segoe UI',
        penwidth='1.5',
        margin='0.3,0.2',
    )

    # Premium edge defaults
    graph.attr('edge',
        color='#64748b',
        fontcolor='#94a3b8',
        fontsize='9',
        fontname='Segoe UI',
        penwidth='1.5',
        arrowsize='0.8',
    )

    # Clusters with premium styling
    clusters = data.get('clusters', {})
    for idx, (cluster_id, cluster_nodes) in enumerate(clusters.items()):
        safe_cluster = re.sub(r'[^a-zA-Z0-9_-]', '_', str(cluster_id))[:20]
        c_color = GV_NODE_COLORS[idx % len(GV_NODE_COLORS)]
        with graph.subgraph(name=f'cluster_{safe_cluster}') as c:
            c.attr(
                label=f'<<FONT COLOR="#f8fafc" POINT-SIZE="12"><B>{cluster_id}</B></FONT>>',
                style='filled,rounded',
                color=c_color,
                fillcolor='#1e293b',
                penwidth='2',
            )
            for node in cluster_nodes:
                safe_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(node))[:30]
                c.node(safe_node, fillcolor='#0f172a')

    # Add nodes with color cycling
    default_node_attrs = data.get('node_attrs', {})
    for i, node_data in enumerate(nodes):
        node_color = GV_NODE_COLORS[i % len(GV_NODE_COLORS)]
        if isinstance(node_data, str):
            node_id = re.sub(r'[^a-zA-Z0-9_ -]', '_', node_data)[:50]
            attrs = {
                'fillcolor': f'{node_color}22',
                'color': node_color,
                'fontcolor': '#f8fafc',
                'style': 'filled,rounded',
                **default_node_attrs,
            }
            graph.node(node_id, **attrs)
        else:
            node_id = re.sub(r'[^a-zA-Z0-9_-]', '_', str(node_data.get('id', '')))[:30]
            node_attrs = {
                'fillcolor': f'{node_color}22',
                'color': node_color,
                'fontcolor': '#f8fafc',
                'style': 'filled,rounded',
                **default_node_attrs,
                **node_data.get('attrs', {}),
            }
            if 'color' in node_attrs and 'fillcolor' not in node_data.get('attrs', {}):
                nc = node_attrs['color']
                node_attrs['fillcolor'] = f'{nc}22' if nc.startswith('#') else nc
            graph.node(node_id, **node_attrs)

    # Add edges with premium styling
    default_edge_attrs = data.get('edge_attrs', {})
    for idx, edge_data in enumerate(edges):
        e_color = GV_NODE_COLORS[idx % len(GV_NODE_COLORS)]
        if isinstance(edge_data, list) and len(edge_data) == 2:
            from_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(edge_data[0]))[:30]
            to_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(edge_data[1]))[:30]
            graph.edge(from_node, to_node, color=f'{e_color}99', **default_edge_attrs)
        else:
            from_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(edge_data.get('from', '')))[:30]
            to_node = re.sub(r'[^a-zA-Z0-9_-]', '_', str(edge_data.get('to', '')))[:30]
            edge_attrs = {**default_edge_attrs, **edge_data.get('attrs', {})}
            if 'color' not in edge_attrs:
                edge_attrs['color'] = f'{e_color}99'
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
        print(f"Local Graphviz failed. Attempting QuickChart API fallback... ({e})")
        full_path = f"{path}.png"
        try:
            resp = requests.post("https://quickchart.io/graphviz",
                json={"graph": graph.source, "format": "png"}, timeout=15)
            if resp.status_code == 200:
                with open(full_path, 'wb') as f:
                    f.write(resp.content)
                print(f"QuickChart API fallback SUCCESS → {full_path}")
                return full_path
            else:
                raise ValueError(f"QuickChart API returned status {resp.status_code}")
        except Exception as qc_e:
            print(f"QuickChart fallback also failed: {qc_e}")
            fallback_path = os.path.join("outputs", f"fallback_{safe_uuid}.png")
            _setup_premium_style()
            fig, ax = plt.subplots(figsize=(8, 5))
            ax.text(0.5, 0.5,
                f"Flowchart Render Failed\nGraphviz not installed locally\n& API fallback failed.\n\n{str(e)[:60]}",
                ha='center', va='center', fontsize=12, color=PALETTE["accent_rose"],
                transform=ax.transAxes, wrap=True)
            ax.set_title(spec.title, fontsize=14, color=PALETTE["text_primary"])
            ax.axis('off')
            fig.savefig(fallback_path, bbox_inches='tight', dpi=150,
                       facecolor=PALETTE["bg_dark"])
            plt.close(fig)
            return fallback_path


# =================== DIFFUSION ADAPTER ===================
async def diffusion_adapter(spec: VisualizationSpec, openai_client: AsyncOpenAI):
    spec.validate_data()

    safe_title = re.sub(r'[^a-zA-Z0-9]', '_', spec.title)[:40]
    safe_uuid = uuid.uuid4().hex[:6]
    filename = f"{safe_title}_{safe_uuid}.png"
    path = os.path.join("outputs", filename)

    try:
        result = await openai_client.images.generate(
            model="dall-e-3",
            prompt=spec.prompt[:1000],
            size="1024x1024",
            n=1
        )
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
        # Premium placeholder image
        _setup_premium_style()
        fig, ax = plt.subplots(figsize=(12, 8))
        gradient = np.linspace(0, 1, 256).reshape(1, -1)
        gradient = np.vstack([gradient] * 128)
        ax.imshow(gradient, cmap='twilight', aspect='auto', extent=[0, 10, 0, 10])
        ax.text(5, 5, f"Conceptual\n{spec.title}", fontsize=20, fontweight='bold',
               ha='center', va='center', color='white',
               path_effects=[patheffects.withStroke(linewidth=3, foreground='black')])
        ax.axis('off')
        fig.savefig(path, bbox_inches='tight', dpi=200, facecolor=PALETTE["bg_dark"])
        plt.close(fig)
        print(f"Diffusion placeholder → {path}")
        return path

    with open(path, 'wb') as f:
        f.write(image_bytes)
    print(f"Diffusion SUCCESS → {path} ({len(image_bytes)//1000}KB)")
    return path


# =================== VISUALIZATION ROUTER ===================
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
                path = await diffusion_adapter(spec, openai_client)
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
            import traceback
            traceback.print_exc()

    return {"outputs": outputs}


def route_decision(state: GraphState):
    analysis_dict = state["analysis"]
    analysis = AnalysisOutput.model_validate(analysis_dict)

    if not analysis.visualizations:
        return END

    first_type = analysis.visualizations[0].type
    if first_type in ["matplotlib", "graphviz", "diffusion"]:
        return "visualize"
    return END


# =================== BUILD GRAPH ===================
builder = StateGraph(GraphState)
builder.add_node("planner", planner_node)
builder.add_node("visualize", visualization_router)

builder.set_entry_point("planner")
builder.add_conditional_edges(
    "planner",
    route_decision,
    {
        "visualize": "visualize",
        END: END
    },
)
builder.add_edge("visualize", END)

app = builder.compile()


# =================== PUBLIC ASYNC RUNNER ===================
async def run_graph(text: str):
    result = await app.ainvoke({"text": text, "analysis": {}, "outputs": []})

    analysis = result.get("analysis", {})
    outputs = result.get("outputs", [])

    return {
        "summary": analysis.get("summary", ""),
        "outputs": outputs
    }

