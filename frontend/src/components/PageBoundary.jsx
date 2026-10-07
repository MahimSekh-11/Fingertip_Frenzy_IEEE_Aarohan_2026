import React from "react";
import { useLocation } from "react-router-dom";
class Boundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="platform"><section className="card" role="alert"><h1>This page could not load.</h1><p>Retry the page or return to the event. Your saved scores are safe.</p><button onClick={() => window.location.reload()}>Retry page</button><a className="button secondary" href="/">Return to event</a></section></div>;
    return this.props.children;
  }
}
export function PageBoundary({ children }) { return <Boundary key={useLocation().pathname}>{children}</Boundary>; }
