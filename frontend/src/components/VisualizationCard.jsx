export default function VisualizationCard({ title, children }) {
    return (
        <div className="viz-card">
            <div className="viz-card-header">
                <h3 className="viz-card-title">{title}</h3>
                <button className="icon-btn" aria-label="More options">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                </button>
            </div>
            <div className="viz-card-content">
                {children || (
                    <div className="viz-placeholder">
                        <div className="mock-chart">
                            <div className="mock-bar" style={{ height: '40%' }}></div>
                            <div className="mock-bar" style={{ height: '70%' }}></div>
                            <div className="mock-bar" style={{ height: '50%' }}></div>
                            <div className="mock-bar" style={{ height: '90%' }}></div>
                            <div className="mock-bar" style={{ height: '30%' }}></div>
                            <div className="mock-bar" style={{ height: '60%' }}></div>
                        </div>
                        <p className="viz-placeholder-text">Visualization will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
}
