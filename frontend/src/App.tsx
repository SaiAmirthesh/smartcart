import { useState } from "react";
import "./App.css";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  tagId: string;
};

type Activity = {
  id: number;
  message: string;
  time: string;
  type: "rfid" | "cart" | "system" | "payment";
};

const initialProducts: Product[] = [
  {
    id: "P001",
    name: "Milk 1L",
    category: "Dairy",
    price: 62,
    quantity: 1,
    tagId: "RFID-A91F2C",
  },
  {
    id: "P002",
    name: "Bread",
    category: "Bakery",
    price: 45,
    quantity: 2,
    tagId: "RFID-B82E19",
  },
  {
    id: "P003",
    name: "Chicken Breast",
    category: "Meat",
    price: 280,
    quantity: 1,
    tagId: "RFID-C71D42",
  },
];

const initialActivity: Activity[] = [
  {
    id: 1,
    message: "Chicken Breast added to cart",
    time: "10:42:18 PM",
    type: "rfid",
  },
  {
    id: 2,
    message: "RFID tag RFID-C71D42 detected",
    time: "10:42:17 PM",
    type: "rfid",
  },
  {
    id: 3,
    message: "Cart connected successfully",
    time: "10:41:52 PM",
    type: "system",
  },
];

function App() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activities, setActivities] = useState<Activity[]>(initialActivity);
  const [rfidConnected] = useState(true);
  const [cartFollowing, setCartFollowing] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);

  const totalItems = products.reduce(
    (total, product) => total + product.quantity,
    0
  );

  const subtotal = products.reduce(
    (total, product) => total + product.price * product.quantity,
    0
  );

  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const formatCurrency = (value: number) => {
    return `₹${value.toFixed(2)}`;
  };

  const updateQuantity = (id: string, change: number) => {
    setProducts((currentProducts) =>
      currentProducts
        .map((product) =>
          product.id === id
            ? {
              ...product,
              quantity: Math.max(0, product.quantity + change),
            }
            : product
        )
        .filter((product) => product.quantity > 0)
    );
  };

  const removeProduct = (id: string) => {
    const product = products.find((item) => item.id === id);

    setProducts((currentProducts) =>
      currentProducts.filter((product) => product.id !== id)
    );

    if (product) {
      addActivity(`${product.name} removed from cart`, "cart");
    }
  };

  const addActivity = (
    message: string,
    type: Activity["type"]
  ) => {
    const newActivity: Activity = {
      id: Date.now(),
      message,
      time: new Date().toLocaleTimeString(),
      type,
    };

    setActivities((current) => [newActivity, ...current]);
  };

  const handleCheckout = () => {
    if (products.length === 0) return;

    setCheckoutDone(true);

    addActivity(
      `Checkout completed • ${formatCurrency(total)}`,
      "payment"
    );
  };

  const generateTransactionId = () => {
    return `SC-${Date.now().toString().slice(-8)}`;
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🛒</div>

          <div>
            <h1>SmartCart</h1>
            <span>Smart Shopping</span>
          </div>
        </div>

        <nav className="navigation">
          <button className="nav-item active">
            <span>▦</span>
            Dashboard
          </button>

          <button className="nav-item">
            <span>🛒</span>
            My Cart
          </button>

          <button className="nav-item">
            <span>📡</span>
            RFID Scanner
          </button>

          <button className="nav-item">
            <span>🧾</span>
            Transactions
          </button>

          <button className="nav-item">
            <span>⚙</span>
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="cart-mini-status">
            <div className="status-dot"></div>

            <div>
              <strong>Cart Connected</strong>
              <span>SmartCart #SC-001</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {/* Header */}
        <header className="header">
          <div>
            <p className="eyebrow">SMART SHOPPING SYSTEM</p>
            <h2>Shopping Dashboard</h2>
            <p className="header-description">
              Manage your cart and track your shopping session in real time.
            </p>
          </div>

          <div className="header-actions">
            <div className="connection-status">
              <span className="online-dot"></span>
              Backend Online
            </div>

            <div className="profile">
              <div className="profile-avatar">U</div>
              <div>
                <strong>Shopper</strong>
                <span>Session Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* System Status */}
        <section className="status-grid">
          <div className="status-card">
            <div className="status-card-icon blue">📡</div>

            <div>
              <span>RFID Reader</span>
              <strong>
                {rfidConnected ? "Connected" : "Disconnected"}
              </strong>

              <small>MFRC522 • 13.56 MHz</small>
            </div>

            <div className="status-indicator green"></div>
          </div>

          <div className="status-card">
            <div className="status-card-icon purple">🛒</div>

            <div>
              <span>Cart Status</span>
              <strong>
                {cartFollowing ? "Following" : "Stationary"}
              </strong>

              <small>Cart #SC-001</small>
            </div>

            <div className="status-indicator green"></div>
          </div>

          <div className="status-card">
            <div className="status-card-icon orange">⏱</div>

            <div>
              <span>Session Time</span>
              <strong>00:24:36</strong>
              <small>Started 10:18 PM</small>
            </div>
          </div>

          <div className="status-card">
            <div className="status-card-icon green">✓</div>

            <div>
              <span>System</span>
              <strong>Operational</strong>
              <small>All services running</small>
            </div>

            <div className="status-indicator green"></div>
          </div>
        </section>

        {/* Dashboard Grid */}
        <section className="dashboard-grid">
          {/* Cart */}
          <div className="card cart-card">
            <div className="card-header">
              <div>
                <h3>Current Cart</h3>
                <span>
                  {totalItems} {totalItems === 1 ? "item" : "items"} detected
                </span>
              </div>

              <button
                className={`follow-button ${cartFollowing ? "following" : ""
                  }`}
                onClick={() => setCartFollowing(!cartFollowing)}
              >
                🤖 {cartFollowing ? "Following" : "Enable Follow"}
              </button>
            </div>

            <div className="cart-list">
              {products.length === 0 ? (
                <div className="empty-cart">
                  <div>🛒</div>
                  <h3>Your cart is empty</h3>
                  <p>
                    Scan an RFID-tagged product to add it to your cart.
                  </p>
                </div>
              ) : (
                products.map((product) => (
                  <div className="product-row" key={product.id}>
                    <div className="product-image">
                      {product.category === "Dairy"
                        ? "🥛"
                        : product.category === "Bakery"
                          ? "🍞"
                          : "🍗"}
                    </div>

                    <div className="product-info">
                      <strong>{product.name}</strong>

                      <span>
                        {product.category} • {product.tagId}
                      </span>
                    </div>

                    <div className="quantity-control">
                      <button
                        onClick={() =>
                          updateQuantity(product.id, -1)
                        }
                      >
                        −
                      </button>

                      <span>{product.quantity}</span>

                      <button
                        onClick={() =>
                          updateQuantity(product.id, 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <div className="product-price">
                      {formatCurrency(
                        product.price * product.quantity
                      )}
                    </div>

                    <button
                      className="delete-button"
                      onClick={() => removeProduct(product.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="scan-banner">
              <div className="scan-icon">📡</div>

              <div>
                <strong>RFID Scanner Ready</strong>
                <span>
                  Place a tagged product inside the cart to scan.
                </span>
              </div>

              <div className="pulse"></div>
            </div>
          </div>

          {/* Billing */}
          <div className="card billing-card">
            <div className="card-header">
              <div>
                <h3>Live Billing</h3>
                <span>Real-time calculation</span>
              </div>

              <span className="live-badge">
                <span></span>
                LIVE
              </span>
            </div>

            <div className="bill-summary">
              <div>
                <span>Items</span>
                <strong>{totalItems}</strong>
              </div>

              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>

              <div>
                <span>GST (5%)</span>
                <strong>{formatCurrency(tax)}</strong>
              </div>
            </div>

            <div className="total-section">
              <span>Total Amount</span>
              <strong>{formatCurrency(total)}</strong>
            </div>

            <button
              className="checkout-button"
              onClick={handleCheckout}
              disabled={products.length === 0 || checkoutDone}
            >
              {checkoutDone
                ? "✓ Checkout Complete"
                : "Proceed to Checkout →"}
            </button>

            {checkoutDone && (
              <div className="transaction-success">
                <span>✓</span>

                <div>
                  <strong>Payment Successful</strong>

                  <small>
                    Transaction ID: {generateTransactionId()}
                  </small>
                </div>
              </div>
            )}

            <p className="secure-text">
              🔒 Secure transaction • Digital receipt generated
            </p>
          </div>
        </section>

        {/* Bottom Section */}
        <section className="bottom-grid">
          {/* Activity */}
          <div className="card activity-card">
            <div className="card-header">
              <div>
                <h3>Live Activity</h3>
                <span>Recent cart events</span>
              </div>

              <button
                className="clear-button"
                onClick={() => setActivities([])}
              >
                Clear
              </button>
            </div>

            <div className="activity-list">
              {activities.length === 0 ? (
                <div className="no-activity">
                  No recent activity.
                </div>
              ) : (
                activities.slice(0, 5).map((activity) => (
                  <div className="activity-item" key={activity.id}>
                    <div
                      className={`activity-icon ${activity.type}`}
                    >
                      {activity.type === "rfid"
                        ? "📡"
                        : activity.type === "payment"
                          ? "₹"
                          : activity.type === "cart"
                            ? "🛒"
                            : "✓"}
                    </div>

                    <div className="activity-info">
                      <strong>{activity.message}</strong>
                      <span>{activity.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Session */}
          <div className="card session-card">
            <div className="card-header">
              <div>
                <h3>Shopping Session</h3>
                <span>Current session information</span>
              </div>
            </div>

            <div className="session-details">
              <div className="detail">
                <span>Session ID</span>
                <strong>SES-2026-0902-001</strong>
              </div>

              <div className="detail">
                <span>Cart ID</span>
                <strong>SC-001</strong>
              </div>

              <div className="detail">
                <span>Last RFID Scan</span>
                <strong>RFID-C71D42</strong>
              </div>

              <div className="detail">
                <span>Products Scanned</span>
                <strong>{totalItems}</strong>
              </div>
            </div>

            <div className="future-robotics">
              <div className="robot-icon">🤖</div>

              <div>
                <strong>ROS 2 Integration</strong>

                <span>
                  Autonomous navigation module ready for future
                  integration.
                </span>
              </div>

              <span className="future-label">FUTURE</span>
            </div>
          </div>
        </section>

        <footer>
          <span>SmartCart © 2026</span>

          <span>
            ESP32 • FastAPI • React • SQLite • ROS 2
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;