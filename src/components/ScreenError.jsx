import { Component } from 'react';

/**
 * A screen that throws must not take the whole desk with it. Without this,
 * React unmounts #root and the panel paints blank paper.
 */
export default class ScreenError extends Component {
  state = { err: null, gen: 0 };

  static getDerivedStateFromError(err) {
    return { err };
  }

  render() {
    if (this.state.err) {
      return (
        <div className="splash grid min-h-screen place-items-center px-6">
          <div className="max-w-sm text-center">
            <span className="auth-mark mx-auto grid h-12 w-12 place-items-center rounded-xl text-sm font-bold text-white">GP</span>
            <p className="mt-4 font-display text-lg text-cream">This screen could not open</p>
            <p className="mt-2 text-sm text-cream/65">{this.state.err.message || 'Something went wrong.'}</p>
            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() => this.setState((s) => ({ err: null, gen: s.gen + 1 }))}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return <div key={this.state.gen}>{this.props.children}</div>;
  }
}
