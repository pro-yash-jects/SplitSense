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
  const [selectedMember, setSelectedMember] = useState('')

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
          <h2>Dashboard - All Debts</h2>
          {loading ? (
            <div>Loading...</div>
          ) : debts.length === 0 ? (
            <div className="muted">No debts</div>
          ) : (
            <div className="debts-list">
              {debts.map((d, i) => (
                <div key={i} className="debt-row">
                  <div className="debt-info">
                    <span className="debt-ower">{d.ower}</span>
                    <span className="debt-arrow">→</span>
                    <span className="debt-receiver">{d.receiver}</span>
                  </div>
                  <div className="debt-amount">{Number(d.amount).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel wide">
          <h2>Member Filter View - Individual Calculations</h2>
          <div className="filter-controls">
            <select 
              value={selectedMember} 
              onChange={(e) => setSelectedMember(e.target.value)}
              className="member-filter-select"
            >
              <option value="">-- Select member to view --</option>
              {members.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {selectedMember ? (
            <div className="member-debts-view">
              <div className="calculations-summary">
                <h3>{selectedMember}'s Account</h3>
                <div className="summary-cards">
                  <div className="summary-card owes">
                    <div className="summary-label">Total Owes</div>
                    <div className="summary-amount">
                      {debts
                        .filter((d) => d.ower === selectedMember)
                        .reduce((sum, d) => sum + Number(d.amount), 0)
                        .toFixed(2)}
                    </div>
                  </div>
                  <div className="summary-card receives">
                    <div className="summary-label">Total Receives</div>
                    <div className="summary-amount">
                      {debts
                        .filter((d) => d.receiver === selectedMember)
                        .reduce((sum, d) => sum + Number(d.amount), 0)
                        .toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="member-debts-sections">
                <div className="debts-section owes-section">
                  <h4>Owes To Others</h4>
                  {debts.filter((d) => d.ower === selectedMember).length === 0 ? (
                    <div className="muted">No debts owed</div>
                  ) : (
                    <div className="colored-debts-list">
                      {debts
                        .filter((d) => d.ower === selectedMember)
                        .map((d, i) => (
                          <div key={i} className="debt-item owes">
                            <div className="debt-to">{selectedMember} owes <strong>{d.receiver}</strong></div>
                            <div className="debt-value">{Number(d.amount).toFixed(2)}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="debts-section receives-section">
                  <h4>Receives From Others</h4>
                  {debts.filter((d) => d.receiver === selectedMember).length === 0 ? (
                    <div className="muted">No debts owed to you</div>
                  ) : (
                    <div className="colored-debts-list">
                      {debts
                        .filter((d) => d.receiver === selectedMember)
                        .map((d, i) => (
                          <div key={i} className="debt-item receives">
                            <div className="debt-from"><strong>{d.ower}</strong> owes {selectedMember}</div>
                            <div className="debt-value">{Number(d.amount).toFixed(2)}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="muted">Select a member to see their individual debt calculations</div>
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
