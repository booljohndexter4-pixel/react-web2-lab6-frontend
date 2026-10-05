import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

// Sa development: walang laman (dumadaan sa proxy sa vite.config.js).
// Sa production (Render): VITE_API_URL ang URL ng deployed LavaLust API.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const getError = (err) =>
  err.response?.data?.error || err.message || 'Something went wrong'

/* ---------------------------- LOGIN ---------------------------- */
function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/login', { username, password })
      localStorage.setItem('access_token', data.tokens.access_token)
      localStorage.setItem('refresh_token', data.tokens.refresh_token)
      localStorage.setItem('username', data.user.username)
      onLogin(data.user.username)
    } catch (err) {
      setError(getError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>Product Management System</h1>
        <p className="muted">Login to continue</p>

        {error && <div className="alert">{error}</div>}

        <label>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}

/* ------------------------- PRODUCT LIST ------------------------- */
const emptyForm = { product_name: '', description: '', price: '', quantity: '' }

function Products({ username, onLogout }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const handleError = (err) => {
    if (err.response?.status === 401) {
      onLogout() // expired o invalid ang token
      return
    }
    setError(getError(err))
  }

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/api/products')
      setProducts(data.data)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      if (editingId) {
        await api.put(`/api/products/${editingId}`, form)
        setMessage('Product updated')
      } else {
        await api.post('/api/products', form)
        setMessage('Product added')
      }
      resetForm()
      loadProducts()
    } catch (err) {
      handleError(err)
    }
  }

  const handleEdit = (p) => {
    setEditingId(p.id)
    setForm({
      product_name: p.product_name,
      description: p.description || '',
      price: p.price,
      quantity: p.quantity,
    })
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.product_name}"?`)) return
    setError('')
    setMessage('')
    try {
      await api.delete(`/api/products/${p.id}`)
      setMessage('Product deleted')
      loadProducts()
    } catch (err) {
      handleError(err)
    }
  }

  return (
    <div className="container">
      <header className="topbar">
        <h1>Product Management System</h1>
        <div>
          <span className="muted">Logged in as {username}</span>
          <button className="secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success">{message}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>
        <div className="grid">
          <div>
            <label>Product name</label>
            <input
              name="product_name"
              value={form.product_name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Price</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Quantity</label>
            <input
              name="quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <label>Description</label>
        <textarea
          name="description"
          rows="2"
          value={form.description}
          onChange={handleChange}
        />
        <div className="actions">
          <button type="submit">{editingId ? 'Update' : 'Add'}</button>
          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <h2>Product List</h2>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : products.length === 0 ? (
          <p className="muted">No products yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.product_name}</td>
                    <td>{p.description}</td>
                    <td>{Number(p.price).toFixed(2)}</td>
                    <td>{p.quantity}</td>
                    <td className="row-actions">
                      <button className="small" onClick={() => handleEdit(p)}>
                        Edit
                      </button>
                      <button
                        className="small danger"
                        onClick={() => handleDelete(p)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ APP ------------------------------ */
export default function App() {
  const [user, setUser] = useState(
    localStorage.getItem('access_token') ? localStorage.getItem('username') : null
  )

  const logout = async () => {
    try {
      await api.post('/api/logout', {
        refresh_token: localStorage.getItem('refresh_token'),
      })
    } catch {
      // kahit mag-error, ituloy ang pag-logout sa browser
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('username')
    setUser(null)
  }

  return user ? (
    <Products username={user} onLogout={logout} />
  ) : (
    <Login onLogin={setUser} />
  )
}
