
import React from "react";
import DriverDeliveries from "./DriverDeliveries";

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

      <DriverDeliveries />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "30px",
    minHeight: "100vh",
    backgroundColor: "var(--bg)",
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
    color: "var(--text)",
  },
  subtitle: {
    color: "var(--muted)",
    marginTop: "8px",
  },
  profile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "var(--text)",
    fontWeight: "bold",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "var(--accent)",
    color: "var(--button-text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default DriverDashboard;
