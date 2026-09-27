import React, { useState, useMemo } from "react";
import { calculateEventSummary } from "../utils/financialEngine";

export default function EventsPage({
  events = [],
  transactions = [],
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onOpenAddTransactionForEvent,
  onDeleteTransaction,
  onBack,
}) {
  const [selectedEventId, setSelectedEventId] = useState(
    events.length > 0 ? events[0].id : null
  );
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("💍");
  const [formBudget, setFormBudget] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formCategories, setFormCategories] = useState(
    "Venue & Decor, Catering, Outfits & Jewelry, Photography, Logistics, Gifts"
  );

  // Calculate dynamic summaries for all events
  const eventSummaries = useMemo(() => {
    return events.map((event) => calculateEventSummary(event, transactions));
  }, [events, transactions]);

  // Selected event summary
  const currentEvent = useMemo(() => {
    return eventSummaries.find((e) => e.id === selectedEventId) || eventSummaries[0] || null;
  }, [eventSummaries, selectedEventId]);

  function handleOpenCreateModal() {
    setEditingEvent(null);
    setFormName("");
    setFormIcon("💍");
    setFormBudget("");
    setFormStartDate("");
    setFormEndDate("");
    setFormCategories("Venue & Decor, Catering, Outfits & Jewelry, Photography, Logistics, Gifts");
    setShowEventModal(true);
  }

  function handleOpenEditModal(event) {
    setEditingEvent(event);
    setFormName(event.name || "");
    setFormIcon(event.icon || "💍");
    setFormBudget(event.budget ? String(event.budget) : "");
    setFormStartDate(event.startDate || "");
    setFormEndDate(event.endDate || "");
    setFormCategories(
      Array.isArray(event.categories)
        ? event.categories.join(", ")
        : event.categories || ""
    );
    setShowEventModal(true);
  }

  function handleSaveEvent(e) {
    e.preventDefault();
    if (!formName.trim() || !formBudget || Number(formBudget) <= 0) {
      alert("Please enter a valid event name and budget.");
      return;
    }

    const categoriesArray = formCategories
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const eventPayload = {
      id: editingEvent ? editingEvent.id : `ev_${Date.now()}`,
      name: formName.trim(),
      icon: formIcon.trim() || "💍",
      budget: Number(formBudget),
      startDate: formStartDate || null,
      endDate: formEndDate || null,
      categories: categoriesArray.length > 0 ? categoriesArray : ["General"],
      status: "active",
    };

    if (editingEvent) {
      onUpdateEvent(eventPayload);
    } else {
      onAddEvent(eventPayload);
      setSelectedEventId(eventPayload.id);
    }

    setShowEventModal(false);
  }

  function handleDelete(id) {
    if (window.confirm("Are you sure you want to delete this event? Linked transactions will be preserved.")) {
      onDeleteEvent(id);
      if (selectedEventId === id) {
        const remaining = events.filter((e) => e.id !== id);
        setSelectedEventId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  }

  return (
    <div className="page-content page events-page">
      <div className="page-title-row">
        <div>
          <span>PACE EVENTS</span>
          <h2>Events & Milestones</h2>
          <p>Track wedding, travel, renovation & life milestone budgets</p>
        </div>
        <button
          type="button"
          className="primary-action-btn"
          onClick={handleOpenCreateModal}
        >
          + New Event
        </button>
      </div>

      {/* Events Selector Pills */}
      {eventSummaries.length > 0 && (
        <div className="event-pill-tabs">
          {eventSummaries.map((ev) => (
            <button
              key={ev.id}
              type="button"
              className={`event-pill-btn ${ev.id === currentEvent?.id ? "active" : ""}`}
              onClick={() => setSelectedEventId(ev.id)}
            >
              <span className="pill-icon">{ev.icon}</span>
              <span className="pill-name">{ev.name}</span>
              <span className="pill-budget">₹{Number(ev.totalSpent).toLocaleString("en-IN")}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Event Dashboard View */}
      {currentEvent ? (
        <div className="event-dashboard">
          {/* Header Card */}
          <div className="event-hero-card">
            <div className="event-hero-top">
              <div className="event-hero-title">
                <span className="event-hero-icon">{currentEvent.icon}</span>
                <div>
                  <h3>{currentEvent.name}</h3>
                  <small>
                    {currentEvent.startDate ? new Date(currentEvent.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Ongoing"}
                    {currentEvent.endDate ? ` — ${new Date(currentEvent.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                  </small>
                </div>
              </div>
              <div className="event-actions">
                <button
                  type="button"
                  className="icon-action-btn"
                  onClick={() => handleOpenEditModal(currentEvent)}
                  title="Edit Event"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="icon-action-btn delete"
                  onClick={() => handleDelete(currentEvent.id)}
                  title="Delete Event"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Financial 4-metric grid */}
            <div className="event-metric-grid">
              <div className="event-metric">
                <small>Total Budget</small>
                <strong>₹{Number(currentEvent.budget).toLocaleString("en-IN")}</strong>
              </div>
              <div className="event-metric spent">
                <small>Total Spent</small>
                <strong>₹{Number(currentEvent.totalSpent).toLocaleString("en-IN")}</strong>
              </div>
              <div className={`event-metric ${currentEvent.isOverBudget ? "over" : "remaining"}`}>
                <small>{currentEvent.isOverBudget ? "Over Budget" : "Remaining"}</small>
                <strong>
                  {currentEvent.isOverBudget
                    ? `+₹${Number(currentEvent.overBudgetAmount).toLocaleString("en-IN")}`
                    : `₹${Number(currentEvent.remaining).toLocaleString("en-IN")}`}
                </strong>
              </div>
              <div className="event-metric">
                <small>% Used</small>
                <strong>{currentEvent.actualPercentage.toFixed(1)}%</strong>
              </div>
            </div>

            {/* Progress bar */}
            <div className="progress event-progress-bar">
              <div
                className={`progress-bar ${currentEvent.isOverBudget ? "danger" : currentEvent.actualPercentage >= 80 ? "warning" : "primary"}`}
                style={{ width: `${Math.min(currentEvent.actualPercentage, 100)}%` }}
              />
            </div>
            <div className="event-progress-caption">
              <span>{currentEvent.transactionCount} transactions recorded</span>
              <span>{currentEvent.isOverBudget ? "⚠️ Budget Exceeded" : `${(100 - currentEvent.actualPercentage).toFixed(0)}% available`}</span>
            </div>

            <div className="event-quick-add">
              <button
                type="button"
                className="event-add-expense-btn"
                onClick={() => onOpenAddTransactionForEvent(currentEvent)}
              >
                + Add Expense to {currentEvent.name}
              </button>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="event-section">
            <div className="section-heading">
              <h3>Category Breakdown</h3>
              <small>Real-time spend by wedding / event head</small>
            </div>

            <div className="event-category-grid">
              {Object.keys(currentEvent.categorySpending).length === 0 ? (
                <div className="empty-subtext">No category spending recorded yet.</div>
              ) : (
                Object.entries(currentEvent.categorySpending)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => {
                    const share = currentEvent.totalSpent > 0 ? (amount / currentEvent.totalSpent) * 100 : 0;
                    return (
                      <div key={cat} className="event-category-card">
                        <div className="event-category-info">
                          <span className="cat-name">{cat}</span>
                          <span className="cat-amount">₹{Number(amount).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="progress small">
                          <div className="progress-bar" style={{ width: `${share}%` }} />
                        </div>
                        <small className="cat-share">{share.toFixed(1)}% of total event spent</small>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Monthly Spend History */}
          {Object.keys(currentEvent.monthlySpending).length > 0 && (
            <div className="event-section">
              <div className="section-heading">
                <h3>Monthly Timeline</h3>
                <small>Outflows across event planning months</small>
              </div>
              <div className="event-monthly-list">
                {Object.entries(currentEvent.monthlySpending)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([monthKey, amt]) => (
                    <div key={monthKey} className="event-monthly-item">
                      <span className="month-tag">📅 {monthKey}</span>
                      <strong className="month-sum">₹{Number(amt).toLocaleString("en-IN")}</strong>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Linked Transactions */}
          <div className="event-section">
            <div className="section-heading">
              <h3>Linked Transactions</h3>
              <small>{currentEvent.transactions.length} items linked</small>
            </div>

            {currentEvent.transactions.length === 0 ? (
              <div className="empty-state-card">
                <span className="empty-icon">🧾</span>
                <p>No transactions linked to this event yet.</p>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => onOpenAddTransactionForEvent(currentEvent)}
                >
                  Log First Event Expense
                </button>
              </div>
            ) : (
              <div className="event-transactions-list">
                {currentEvent.transactions.map((tx) => (
                  <div key={tx.id} className="event-tx-item">
                    <div className="event-tx-left">
                      <span className="event-tx-icon">{tx.icon || "💍"}</span>
                      <div>
                        <strong>{tx.title}</strong>
                        <div className="event-tx-meta">
                          <span>{tx.category}</span>
                          <span>•</span>
                          <span>{tx.date}</span>
                          {tx.note && <span>• {tx.note}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="event-tx-right">
                      <span className="event-tx-amount">₹{Number(tx.amount).toLocaleString("en-IN")}</span>
                      <button
                        type="button"
                        className="tx-del-btn"
                        onClick={() => onDeleteTransaction(tx.id)}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state-card large">
          <span className="empty-icon">💍</span>
          <h3>No Events Created Yet</h3>
          <p>Plan weddings, vacations, home renovations, and large life milestones with dedicated budgets and linked expenses.</p>
          <button type="button" className="primary-action-btn" onClick={handleOpenCreateModal}>
            + Create First Event
          </button>
        </div>
      )}

      {/* Modal for Create/Edit Event */}
      {showEventModal && (
        <div className="modal-overlay" onMouseDown={() => setShowEventModal(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <div>
                <span>PACE EVENTS</span>
                <h2>{editingEvent ? "Edit Event" : "Create Milestone Event"}</h2>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowEventModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="event-form">
              <div className="form-group">
                <label>Event Icon & Name</label>
                <div className="icon-input-row">
                  <select
                    className="input-select icon-select"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                  >
                    <option value="💍">💍 Wedding / Shaadi</option>
                    <option value="✈️">✈️ Vacation / Travel</option>
                    <option value="🏡">🏡 Home Renovation</option>
                    <option value="🎓">🎓 Higher Education</option>
                    <option value="👶">👶 Baby / Childcare</option>
                    <option value="🎉">🎉 Festival / Celebration</option>
                    <option value="🚗">🚗 Vehicle Purchase</option>
                    <option value="⭐">⭐ Special Milestone</option>
                  </select>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g. Rohan & Priya Wedding"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Total Event Budget (₹)</label>
                <input
                  type="number"
                  className="input-text"
                  placeholder="e.g. 500000"
                  value={formBudget}
                  onChange={(e) => setFormBudget(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    className="input-text"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Target / End Date</label>
                  <input
                    type="date"
                    className="input-text"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Sub-Categories (Comma-separated)</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Venue, Catering, Outfits, Photography"
                  value={formCategories}
                  onChange={(e) => setFormCategories(e.target.value)}
                />
                <small className="field-hint">Used to tag individual expenses for category breakdown</small>
              </div>

              <div className="modal-btn-row">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-action-btn">
                  {editingEvent ? "Save Changes" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
