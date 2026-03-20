// Simple global flag to signal dashboard to refresh stats
// Set by Results/Game screens, consumed by DashboardScreen

let _needsRefresh = false;

export function setDashboardNeedsRefresh() {
  _needsRefresh = true;
}

export function consumeDashboardRefresh(): boolean {
  if (_needsRefresh) {
    _needsRefresh = false;
    return true;
  }
  return false;
}
