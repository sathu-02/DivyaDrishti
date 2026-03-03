export default function SummaryCard({ title, value, trend, trendValue }) {
    const isUp = trend === 'up';
    const trendColor = isUp ? 'var(--success)' : 'var(--danger)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {title}
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: '1' }}>
                {value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: '600', color: trendColor, marginTop: '0.25rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    {isUp ? (
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                    ) : (
                        <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                    )}
                </svg>
                <span>{trendValue}</span>
            </div>
        </div>
    );
}
