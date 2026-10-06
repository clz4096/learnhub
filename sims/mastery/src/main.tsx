import { render } from 'preact';
import { init } from '@/model/store';
import { loadTheme } from '@/model/theme';
import { startSync, takeAuthFragment } from '@/sync/app';
import { App } from '@/ui/App';
// KaTeX's styles and fonts, bundled from the npm package: no CDN.
import 'katex/dist/katex.min.css';
// STIX Two Text, bundled from @fontsource: no CDN. Latin, Latin Extended, and Greek only;
// each subset downloads when a page first uses one of its characters.
import '@fontsource/stix-two-text/latin-400.css';
import '@fontsource/stix-two-text/latin-ext-400.css';
import '@fontsource/stix-two-text/greek-400.css';
import '@fontsource/stix-two-text/latin-400-italic.css';
import '@fontsource/stix-two-text/latin-500.css';
import '@fontsource/stix-two-text/latin-600.css';
// The arms, the seal, and the documents (Letters): Cormorant Garamond for the seal's legend
// and the arms' scroll, Frank Ruhl Libre for the arms' Hebrew, Spectral and Spectral SC for
// the certificate, and the two signature hands. Downloaded only when a page uses them.
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/frank-ruhl-libre/hebrew-700.css';
import '@fontsource/spectral/latin-300.css';
import '@fontsource/spectral/latin-300-italic.css';
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral-sc/latin-500.css';
import '@fontsource/mrs-saint-delafield/latin-400.css';
import '@fontsource/herr-von-muellerhoff/latin-400.css';
import '@/styles/tokens.css';
import '@/styles/app.css';
import '@/styles/story.css';

loadTheme();
// Before the first render: a sign-in redirect's tokens leave the URL before anything reads it.
const fragment = takeAuthFragment();
void startSync(init(), fragment);
render(<App />, document.getElementById('app')!);
