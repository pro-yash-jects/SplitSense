import { useEffect, useState } from 'react'
import './App.css'

const API = 'http://localhost:6969'

function App() {
  const [members, setMembers] = useState([])
  const [name, setName] = useState('')

  const [paidBy, setPaidBy] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const [expenses, setExpenses] = useState([])
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [mRes, eRes, dRes] = await Promise.all([
        fetch(`${API}/members`),
        fetch(`${API}/expenses`),
        fetch(`${API}/debts`),
      ])

      const [mJson, eJson, dJson] = await Promise.all([
        mRes.json(),
        eRes.json(),
        dRes.json(),
      ])

      setMembers(mJson)
      setExpenses(eJson)
      setDebts(dJson)
      if (!paidBy && mJson.length) setPaidBy(mJson[0])
    } catch (err) {
      setError('Failed to fetch data from backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const addMember = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      const res = await fetch(`${API}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Add member failed')
      setMembers(json.members)
      setName('')
    } catch (err) {
      setError(err.message)
    }
  }

  const addExpense = async (e) => {
    e.preventDefault()
    if (!paidBy || !amount) return
    try {
      const res = await fetch(`${API}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidBy, amount: parseFloat(amount), description }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Add expense failed')
      setDescription('')
      setAmount('')
      await fetchAll()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>SplitSense</h1>
        <p className="tag">Simple expense splitting dashboard</p>
      </header>

      <main className="main-grid">
        <section className="panel members-panel">
          <h2>Members</h2>
          <form onSubmit={addMember} className="row">
            <input
              placeholder="Add member name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit">Add</button>
          </form>

          <ul className="list">
            {members.length === 0 && <li className="muted">No members yet</li>}
            {members.map((m) => (
              <li key={m} className="member-row">
                <div className="mname">{m}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel expense-panel">
          <h2>Add Expense</h2>
          <form onSubmit={addExpense} className="form-grid">
            <div className="form-row">
              <label className="field">
                <div className="field-label">Paid By</div>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                  <option value="">-- select --</option>
                  {members.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <div className="field-label">Amount</div>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            </div>

            <label className="field full">
              <div className="field-label">Description</div>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>

            <div className="actions">
              <button type="submit">Add Expense</button>
              <button type="button" onClick={fetchAll} className="secondary">
                Refresh
              </button>
            </div>
          </form>
        </section>

        <section className="panel wide">
          <h2>Debts</h2>
          {loading ? (
            <div>Loading...</div>
          ) : debts.length === 0 ? (
            <div className="muted">No debts</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Ower</th>
                  <th>Receiver</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((d, i) => (
                  <tr key={i}>
                    <td>{d.ower}</td>
                    <td>{d.receiver}</td>
                    <td>{Number(d.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel wide">
          <h2>Expenses</h2>
          {expenses.length === 0 ? (
            <div className="muted">No transactions yet</div>
          ) : (
            <ol className="list">
              {expenses
                .slice()
                .reverse()
                .map((ex) => (
                  <li key={ex.id}>
                    <strong>{ex.paidBy}</strong> paid <em>{Number(ex.amount).toFixed(2)}</em>
                    {ex.description ? ` — ${ex.description}` : ''}
                    <div className="tiny muted">{new Date(ex.date).toLocaleString()}</div>
                  </li>
                ))}
            </ol>
          )}
        </section>
      </main>

      {error && <div className="error">{error}</div>}

      <footer className="foot">
        <small>Backend: {API} · Refresh to sync</small>
      </footer>
    </div>
  )
}

export default App
