import './summarypanel.css';

export default function SummaryPanel({ detailMode = 'mine', activeDetail = {} }) {
    const title =
        detailMode === 'mine'
            ? 'My Tasks, In-depth Summary'
            : `${activeDetail?.name || 'Friend Name'}, In-depth Summary`;

    const summary = activeDetail?.summary || 'Summary text will appear here.';
    const highlights = Array.isArray(activeDetail?.highlights)
        ? activeDetail.highlights
        : [];

    return (
        <section className="summary-panel">
            <h1 className="summary-panel__title">{title}</h1>
            <p className="summary-panel__text">{summary}</p>

            <ul className="summary-panel__list">
                {highlights.length > 0 ? (
                    highlights.map((item, index) => (
                        <li key={`${item}-${index}`} className="summary-panel__item">
                            {item}
                        </li>
                    ))
                ) : (
                    <li className="summary-panel__item">Highlights will appear here.</li>
                )}
            </ul>
        </section>
    );
}
