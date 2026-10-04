import { render } from 'preact';
import { App } from '@/App';
import '@/styles/tokens.css';
import '@/styles/hub.css';

render(<App />, document.getElementById('app')!);
