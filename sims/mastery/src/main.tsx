import { render } from 'preact';
import { init } from '@/model/store';
import { loadTheme } from '@/model/theme';
import { startSync, takeAuthFragment } from '@/sync/app';
import { App } from '@/ui/App';
// KaTeX's styles and fonts, bundled from the npm package: no CDN.
import 'katex/dist/katex.min.css';
import '@/styles/tokens.css';
import '@/styles/app.css';

loadTheme();
// Before the first render: a sign-in redirect's tokens leave the URL before anything reads it.
const fragment = takeAuthFragment();
void startSync(init(), fragment);
render(<App />, document.getElementById('app')!);
