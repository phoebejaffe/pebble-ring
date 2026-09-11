export function App() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Pebble Index</p>
        <h1>Webhook receiver</h1>
        <p>
          This project receives Index recordings and transcriptions through a private Firebase
          Function and stores them for future categorization and automation.
        </p>
        <p className="muted">
          Configure the deployed <code>pebbleWebhook</code> URL and authentication header in the
          Pebble Index app.
        </p>
      </section>
    </main>
  );
}
