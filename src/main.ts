import './style.css';
import { renderApp } from './app.ts';

const container = document.querySelector<HTMLDivElement>('#app');

if (!container) {
  throw new Error('Expected #app root element to exist.');
}

renderApp(container);
