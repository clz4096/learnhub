import { render } from 'preact';
import { init } from '@/model/store';
import { loadTheme } from '@/model/theme';
import { App } from '@/ui/App';
// KaTeX's styles and fonts, bundled from the npm package: no CDN.
import 'katex/dist/katex.min.css';
import '@/styles/tokens.css';
import '@/styles/app.css';

loadTheme();
void init();
render(<App />, document.getElementById('app')!);
