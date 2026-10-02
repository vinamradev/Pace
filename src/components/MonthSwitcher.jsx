import { formatMonthName, getPreviousMonthKey, getNextMonthKey, toMonthKey } from "../utils/financialEngine";

export default function MonthSwitcher({ currentMonthKey, onMonthChange }) {
  const isCurrentActualMonth = currentMonthKey === toMonthKey();

  function handlePrev() {
    onMonthChange(getPreviousMonthKey(currentMonthKey));
  }

  function handleNext() {
    onMonthChange(getNextMonthKey(currentMonthKey));
  }

  function handleResetCurrent() {
    onMonthChange(toMonthKey());
  }

  return (
    <div className="month-switcher-container">
      <div className="month-switcher">
        <button
          type="button"
          className="month-nav-btn"
          onClick={handlePrev}
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="month-display">
          <span className="month-icon">📅</span>
          <span className="month-label">{formatMonthName(currentMonthKey)}</span>
        </div>

        <button
          type="button"
          className="month-nav-btn"
          onClick={handleNext}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {!isCurrentActualMonth && (
        <button
          type="button"
          className="month-reset-btn"
          onClick={handleResetCurrent}
        >
          Jump to Current Month
        </button>
      )}
    </div>
  );
}
