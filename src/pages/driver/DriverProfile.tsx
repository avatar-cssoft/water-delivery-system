
import React from "react";

const DriverDashboard: React.FC = () => {
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Driver Dashboard</h1>
          <p style={styles.subtitle}>
            Welcome to your delivery workspace.
          </p>
        </div>

        <div style={styles.profile}>
          <div style={styles.avatar}>D</div>
          <span>Driver</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.cards}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Assigned Deliveries</p>
          <h2 style={styles.cardNumber}>0</h2>
          <p style={styles.cardDescription}>Your assigned orders</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>In Progress</p>
          <h2 style={styles.cardNumber}>0</h2>
          <p style={styles.cardDescription}>Deliveries on the way</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Completed</p>
          <h2 style={styles.cardNumber}>0</h2>
          <p style={styles.cardDescription}>Successfully delivered</p>
        </div>
      </div>

      {/* Deliveries Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>My Deliveries</h2>
        <p style={styles.sectionSubtitle}>
          View and manage the orders assigned to you.
        </p>

        <div style={styles.emptyState}>
          <h3>No deliveries assigned yet</h3>
          <p>
            Your assigned deliveries will appear here once the
            administrator assigns an order to you.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "30px",
    minHeight: "100vh",
    backgroundColor: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "15px",
  },
  heading: {
    fontSize: "28px",
    margin: 0,
    color: "#1e293b",
  },
  subtitle: {
    color: "#64748b",
    marginTop: "8px",
  },
  profile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#334155",
    fontWeight: "bold",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "22px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  cardLabel: {
    color: "#64748b",
    fontSize: "14px",
    margin: 0,
  },
  cardNumber: {
    color: "#1e293b",
    fontSize: "32px",
    margin: "12px 0",
  },
  cardDescription: {
    color: "#94a3b8",
    fontSize: "13px",
    margin: 0,
  },
  section: {
    backgroundColor: "#ffffff",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    color: "#1e293b",
    margin: 0,
  },
  sectionSubtitle: {
    color: "#64748b",
    fontSize: "14px",
  },
  emptyState: {
    textAlign: "center",
    padding: "45px 20px",
    color: "#64748b",
  },
};

export default DriverDashboard;
