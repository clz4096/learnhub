import { render } from 'preact';
import { App } from '@/ui/App';
import '@/ui/center/view3d';
import '@/styles/tokens.css';
import '@/styles/app.css';

render(<App />, document.getElementById('app')!);
