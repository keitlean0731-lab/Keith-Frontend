<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, clearTokens, hasSession, setTokens } from './services/api'

const mode = ref('login')
const loading = ref(false)
const booting = ref(true)
const error = ref('')
const notice = ref('')
const user = ref(null)
const products = ref([])
const users = ref([])
const activeView = ref('overview')
const form = ref({ username: '', email: '', password: '', role: 'user' })
const productForm = ref({ product_name: '', description: '', price: '', quantity: '' })

const isAdmin = computed(() => user.value?.role === 'admin')
const firstName = computed(() => user.value?.username?.split(' ')[0] || 'there')
const currentTitle = computed(() => activeView.value === 'products' ? 'Products' : activeView.value === 'users' ? 'Team access' : 'Overview')

function resetMessage() {
  error.value = ''
  notice.value = ''
}

async function loadWorkspace() {
  const [profile, productResponse] = await Promise.all([api.profile(), api.products()])
  user.value = profile
  products.value = Array.isArray(productResponse) ? productResponse : productResponse.data || []
}

async function boot() {
  if (!hasSession()) {
    booting.value = false
    return
  }

  try {
    await loadWorkspace()
  } catch {
    clearTokens()
  } finally {
    booting.value = false
  }
}

async function submitAuth() {
  resetMessage()
  loading.value = true
  try {
    const response = mode.value === 'login'
      ? await api.login({ email: form.value.email, password: form.value.password, role: form.value.role })
      : await api.register(form.value)

    if (mode.value === 'register') {
      mode.value = 'login'
      notice.value = response.message || 'Account created. You can sign in now.'
      form.value.password = ''
      return
    }

    setTokens(response)
    await loadWorkspace()
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    loading.value = false
  }
}

async function showView(view) {
  resetMessage()
  activeView.value = view
  if (view === 'users' && users.value.length === 0) {
    loading.value = true
    try {
      const response = await api.users()
      users.value = Array.isArray(response) ? response : response.data || []
    } catch (requestError) {
      error.value = requestError.message
    } finally {
      loading.value = false
    }
  }
}

async function createProduct() {
  resetMessage()
  loading.value = true
  try {
    await api.createProduct({
      product_name: productForm.value.product_name,
      description: productForm.value.description,
      price: Number(productForm.value.price),
      quantity: Number(productForm.value.quantity),
    })
    productForm.value = { product_name: '', description: '', price: '', quantity: '' }
    await showView('products')
    await loadWorkspace()
    notice.value = 'Product created.'
  } catch (requestError) {
    error.value = requestError.message
  } finally {
    loading.value = false
  }
}

async function deleteProduct(product) {
  if (!window.confirm(`Delete ${product.product_name || 'this product'}?`)) return
  resetMessage()
  try {
    await api.deleteProduct(product.id)
    products.value = products.value.filter((item) => item.id !== product.id)
    notice.value = 'Product deleted.'
  } catch (requestError) {
    error.value = requestError.message
  }
}

async function logout() {
  try {
    if (hasSession()) await api.logout()
  } catch {
    // A revoked or expired refresh token still ends the local session.
  } finally {
    clearTokens()
    user.value = null
    products.value = []
    users.value = []
  }
}

onMounted(boot)
</script>

<template>
  <main class="app-shell">
    <section v-if="booting" class="boot-screen">
      <div class="brand-mark">L</div>
      <p>Connecting to LavaLust</p>
    </section>

    <section v-else-if="!user" class="auth-layout">
      <div class="auth-intro">
        <div class="brand-lockup"><span class="brand-mark">L</span><span>SHOP</span></div>
        <div class="intro-copy">
          <p class="eyebrow">Product workspace</p>
          <h1>Make the next release feel inevitable.</h1>
          <p>One place to keep your catalog, people, and product decisions moving.</p>
        </div>
        <div class="intro-foot"></div>
      </div>

      <div class="auth-panel">
        <div class="auth-panel-top">
          <span class="eyebrow">{{ mode === 'login' ? 'Welcome back' : 'Create access' }}</span>
          <span class="connection-state"><i></i> API ready</span>
        </div>
        <h2>{{ mode === 'login' ? 'Sign in to your workspace' : 'Create your account' }}</h2>
        <p class="muted">{{ mode === 'login' ? 'Use your account credentials to continue.' : 'Start with an account and invite your team later.' }}</p>

        <form @submit.prevent="submitAuth">
          <label v-if="mode === 'register'">Email<input v-model="form.email" type="email" autocomplete="email" required /></label>
          <label v-else>Email<input v-model="form.email" type="email" autocomplete="email" required /></label>
          <label v-if="mode === 'register'">Username<input v-model="form.username" type="text" autocomplete="username" required /></label>
          <label>Password<input v-model="form.password" type="password" autocomplete="current-password" required /></label>
          <label v-if="mode === 'login'">Login as<select v-model="form.role" required><option value="user">User</option><option value="admin">Admin</option></select></label>
          <p v-if="error" class="form-error">{{ error }}</p>
          <p v-if="notice" class="form-notice">{{ notice }}</p>
          <button class="primary-button" type="submit" :disabled="loading">
            {{ loading ? 'Working...' : mode === 'login' ? 'Enter workspace' : 'Create account' }}
          </button>
        </form>

        <button class="text-button" type="button" @click="mode = mode === 'login' ? 'register' : 'login'; resetMessage()">
          {{ mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in' }}
        </button>
      </div>
    </section>

    <section v-else class="workspace">
      <aside class="sidebar">
        <div class="brand-lockup"><span class="brand-mark">L</span><span>SHOP</span></div>
        <nav>
          <button :class="{ active: activeView === 'overview' }" @click="showView('overview')"><span>01</span> Overview</button>
          <button :class="{ active: activeView === 'products' }" @click="showView('products')"><span>02</span> Products</button>
          <button v-if="isAdmin" :class="{ active: activeView === 'users' }" @click="showView('users')"><span>03</span> Team access</button>
        </nav>
        <div class="sidebar-bottom">
          <div class="user-chip"><div class="avatar">{{ user.username?.charAt(0).toUpperCase() }}</div><div><strong>{{ user.username }}</strong><small>{{ user.role }}</small></div></div>
          <button class="logout-button" @click="logout">Sign out</button>
        </div>
      </aside>

      <div class="workspace-main">
        <header class="topbar">
          <div><span class="eyebrow">LavaLust workspace</span><h1>{{ currentTitle }}</h1></div>
          <div class="topbar-user"><span>{{ user.email }}</span><div class="avatar">{{ user.username?.charAt(0).toUpperCase() }}</div></div>
        </header>

        <div class="content">
          <p v-if="error" class="global-message error-message">{{ error }}</p>
          <p v-if="notice" class="global-message success-message">{{ notice }}</p>

          <template v-if="activeView === 'overview'">
            <div class="welcome-row"><div><p class="eyebrow">Good to see you</p><h2>Welcome, {{ firstName }}.</h2><p class="muted">Here is the current shape of your workspace.</p></div><button class="primary-button compact" @click="showView('products')">View products</button></div>
            <div class="metric-grid">
              <article class="metric-card accent-card"><span>Catalog size</span><strong>{{ products.length }}</strong><small>products in your workspace</small></article>
              <article class="metric-card"><span>Access level</span><strong class="word-metric">{{ user.role }}</strong><small>current account role</small></article>
              <article class="metric-card"><span>API status</span><strong class="status-metric"><i></i> Live</strong><small>connected to LavaLust</small></article>
            </div>
            <div class="overview-grid">
              <section class="panel recent-panel"><div class="panel-heading"><div><p class="eyebrow">Catalog pulse</p><h3>Latest products</h3></div><button class="text-button" @click="showView('products')">See all</button></div><div v-if="products.length" class="mini-list"><div v-for="product in products.slice(0, 4)" :key="product.id" class="mini-row"><span class="product-symbol">{{ (product.product_name || 'P').charAt(0).toUpperCase() }}</span><div><strong>{{ product.product_name || 'Unnamed product' }}</strong><small>{{ product.description || 'No description' }}</small></div><b>{{ product.quantity ?? 0 }} units</b></div></div><div v-else class="empty-state"><strong>No products yet</strong><span>Add your first product to see it here.</span></div></section>
              <section class="panel note-panel"><span class="large-mark">“</span><p>Keep the catalog clear enough that the next good decision is obvious.</p><small>LavaLust workspace principle</small></section>
            </div>
          </template>

          <template v-else-if="activeView === 'products'">
            <div class="section-heading"><div><p class="eyebrow">Catalog</p><h2>Products</h2><p class="muted">Manage what your customers can find.</p></div></div>
            <div class="product-layout">
              <section class="panel product-table-panel"><div class="panel-heading"><h3>All products</h3><span class="count-label">{{ products.length }} total</span></div><div v-if="loading && !products.length" class="skeleton-list"><i v-for="n in 4" :key="n"></i></div><div v-else-if="products.length" class="product-list"><div v-for="product in products" :key="product.id" class="product-row"><div class="product-symbol">{{ (product.product_name || 'P').charAt(0).toUpperCase() }}</div><div class="product-details"><strong>{{ product.product_name || 'Unnamed product' }}</strong><span>{{ product.description || 'No description added' }}</span></div><span class="price">{{ product.price != null ? `₱${Number(product.price).toLocaleString()}` : 'No price' }}</span><span class="quantity">{{ product.quantity ?? 0 }} in stock</span><button v-if="isAdmin" class="icon-button" title="Delete product" @click="deleteProduct(product)">×</button></div></div><div v-else class="empty-state"><strong>Your catalog is empty</strong><span>Create a product to begin.</span></div></section>
              <section v-if="isAdmin" class="panel create-panel"><p class="eyebrow">Admin action</p><h3>Add a product</h3><form @submit.prevent="createProduct"><label>Product name<input v-model="productForm.product_name" required /></label><label>Description<textarea v-model="productForm.description" rows="3"></textarea></label><div class="field-grid"><label>Price<input v-model="productForm.price" type="number" min="0" step="0.01" required /></label><label>Quantity<input v-model="productForm.quantity" type="number" min="0" required /></label></div><button class="primary-button" type="submit" :disabled="loading">{{ loading ? 'Saving...' : 'Add product' }}</button></form></section>
            </div>
          </template>

          <template v-else>
            <div class="section-heading"><div><p class="eyebrow">Administration</p><h2>Team access</h2><p class="muted">People with access to this workspace.</p></div></div>
            <section class="panel team-panel"><div v-if="loading" class="skeleton-list"><i v-for="n in 4" :key="n"></i></div><div v-else-if="users.length" class="team-list"><div v-for="member in users" :key="member.id" class="team-row"><div class="avatar">{{ member.username?.charAt(0).toUpperCase() }}</div><div><strong>{{ member.username }}</strong><span>{{ member.email }}</span></div><b>{{ member.role }}</b></div></div><div v-else class="empty-state"><strong>No team members found</strong><span>Invite access through the API when ready.</span></div></section>
          </template>
        </div>
      </div>
    </section>
  </main>
</template>
