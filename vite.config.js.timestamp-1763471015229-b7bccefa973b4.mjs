// vite.config.js
import { svelte } from "file:///C:/Users/tspla/Documents/FoundryProjects/gitHub/autoanimations/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import {
  postcssConfig,
  terserConfig
} from "file:///C:/Users/tspla/Documents/FoundryProjects/gitHub/autoanimations/node_modules/@typhonjs-fvtt/runtime/.rollup/remote/index.js";
import { sveltePreprocess } from "file:///C:/Users/tspla/Documents/FoundryProjects/gitHub/autoanimations/node_modules/svelte-preprocess/dist/index.js";

// module.json
var module_default = {
  id: "autoanimations",
  title: "Automated Animations",
  description: "This will automatically run most JB2A Animations such as Melee/Ranged Attacks, Spell Attacks, and Instant Spells",
  authors: [
    {
      name: "theripper93",
      email: "tsplab@gmail.com",
      url: "https://www.patreon.com/theripper93"
    },
    {
      name: "Otigon (Otigon#2010)",
      discord: "Otigon#2010"
    }
  ],
  url: "https://github.com/theripper93/autoanimations",
  version: "6.0.0",
  compatibility: {
    minimum: "13",
    verified: "13"
  },
  scripts: [],
  esmodules: [
    "dist/autoanimations.js"
  ],
  styles: [
    "dist/autoanimations.css"
  ],
  flags: {
    hotReload: {
      extensions: ["json"],
      paths: ["lang"]
    }
  },
  languages: [
    {
      lang: "en",
      name: "English",
      path: "lang/en.json"
    },
    {
      lang: "es",
      name: "Espa\xF1ol",
      path: "lang/es.json"
    },
    {
      lang: "it",
      name: "Italiano",
      path: "lang/it.json"
    },
    {
      lang: "ko",
      name: "Korean",
      path: "lang/ko.json"
    },
    {
      lang: "ja",
      name: "\u65E5\u672C\u8A9E",
      path: "lang/ja.json"
    },
    {
      lang: "fr",
      name: "Fran\xE7ais",
      path: "lang/fr.json"
    },
    {
      lang: "pt-BR",
      name: "Portugu\xEAs (Brasil)",
      path: "lang/pt-br.json"
    },
    {
      lang: "de",
      name: "Deutsch",
      path: "lang/de.json"
    },
    {
      lang: "zh-tw",
      name: "\u6B63\u9AD4\u4E2D\u6587",
      path: "lang/zh-tw.json"
    },
    {
      lang: "cs",
      name: "\u010Ce\u0161tina",
      path: "lang/cs.json"
    },
    {
      lang: "cn",
      name: "\u4E2D\u6587\uFF08\u7B80\u4F53\uFF09",
      path: "lang/zh_Hans.json"
    }
  ],
  relationships: {
    requires: [
      {
        id: "sequencer",
        type: "module",
        manifest: "https://github.com/fantasycalendar/FoundryVTT-Sequencer/releases/latest/download/module.json"
      },
      {
        id: "socketlib",
        type: "module"
      }
    ]
  },
  socket: true,
  manifest: "https://github.com/otigon/automated-jb2a-animations/releases/latest/download/module.json",
  download: "https://github.com/otigon/automated-jb2a-animations/releases/download/0.6.71/module.zip"
};

// vite.config.js
var s_PACKAGE_ID = `modules/${module_default.id}`;
var s_SVELTE_HASH_ID = "auto";
var s_COMPRESS = false;
var s_SOURCEMAPS = true;
var vite_config_default = ({ mode }) => {
  const compilerOptions = mode === "production" ? {
    cssHash: ({ hash, css }) => `svelte-${s_SVELTE_HASH_ID}-${hash(css)}`
  } : {};
  return {
    root: "src/",
    // Source location / esbuild root.
    base: `/${s_PACKAGE_ID}/dist`,
    // Base module path that 30001 / served dev directory.
    publicDir: false,
    // No public resources to copy.
    cacheDir: "../.vite-cache",
    // Relative from root directory.
    resolve: { conditions: ["browser", "import"] },
    esbuild: {
      target: ["es2022"]
    },
    css: {
      // Creates a standard configuration for PostCSS with autoprefixer & postcss-preset-env.
      postcss: postcssConfig({ compress: s_COMPRESS, sourceMap: s_SOURCEMAPS })
    },
    // About server options:
    // - Set to `open` to boolean `false` to not open a browser window automatically. This is useful if you set up a
    // debugger instance in your IDE and launch it with the URL: 'http://localhost:30001/game'.
    //
    // - The top proxy entry redirects requests under the module path for `style.css` and following standard static
    // directories: `assets`, `lang`, and `packs` and will pull those resources from the main Foundry / 30000 server.
    // This is necessary to reference the dev resources as the root is `/src` and there is no public / static
    // resources served with this particular Vite configuration. Modify the proxy rule as necessary for your
    // static resources / project.
    server: {
      port: 30001,
      open: "/game",
      proxy: {
        // Serves static files from main Foundry server.
        [`^(/${s_PACKAGE_ID}/(assets|lang|packs|style.css))`]: "http://localhost:30000",
        // All other paths besides package ID path are served from main Foundry server.
        [`^(?!/${s_PACKAGE_ID}/)`]: "http://localhost:30000",
        // Rewrite incoming `module-id.js` request from Foundry to the dev server `index.js`.
        [`/${s_PACKAGE_ID}/dist/${module_default.id}.js`]: {
          target: `http://localhost:30001/${s_PACKAGE_ID}/dist`,
          rewrite: () => "/index.js"
        },
        // Enable socket.io from main Foundry server.
        "/socket.io": { target: "ws://localhost:30000", ws: true }
      }
    },
    build: {
      outDir: "../dist",
      emptyOutDir: false,
      sourcemap: s_SOURCEMAPS,
      brotliSize: true,
      minify: s_COMPRESS ? "terser" : false,
      target: ["es2022"],
      terserOptions: s_COMPRESS ? { ...terserConfig(), ecma: 2022 } : void 0,
      lib: {
        entry: "./index.js",
        formats: ["es"],
        fileName: module_default.id
      },
      rollupOptions: {
        output: {
          // Rewrite the default style.css to a more recognizable file name.
          assetFileNames: (assetInfo) => assetInfo.name === "style.css" ? `${module_default.id}.css` : assetInfo.name
        }
      }
    },
    // Necessary when using the dev server for top-level await usage inside TRL.
    optimizeDeps: {
      esbuildOptions: {
        target: "es2022"
      }
    },
    plugins: [
      svelte({
        compilerOptions,
        preprocess: sveltePreprocess()
      })
    ]
  };
};
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAibW9kdWxlLmpzb24iXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx0c3BsYVxcXFxEb2N1bWVudHNcXFxcRm91bmRyeVByb2plY3RzXFxcXGdpdEh1YlxcXFxhdXRvYW5pbWF0aW9uc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdHNwbGFcXFxcRG9jdW1lbnRzXFxcXEZvdW5kcnlQcm9qZWN0c1xcXFxnaXRIdWJcXFxcYXV0b2FuaW1hdGlvbnNcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3RzcGxhL0RvY3VtZW50cy9Gb3VuZHJ5UHJvamVjdHMvZ2l0SHViL2F1dG9hbmltYXRpb25zL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgc3ZlbHRlIH0gICAgICAgICAgICAgZnJvbSAnQHN2ZWx0ZWpzL3ZpdGUtcGx1Z2luLXN2ZWx0ZSc7XG5cbmltcG9ydCB7XG4gICBwb3N0Y3NzQ29uZmlnLFxuICAgdGVyc2VyQ29uZmlnIH0gICAgICAgICAgICAgZnJvbSAnQHR5cGhvbmpzLWZ2dHQvcnVudGltZS9yb2xsdXAnO1xuXG5pbXBvcnQgeyBzdmVsdGVQcmVwcm9jZXNzIH0gICBmcm9tICdzdmVsdGUtcHJlcHJvY2Vzcyc7XG5cbmltcG9ydCBtb2R1bGVKU09OICAgICAgICAgICAgIGZyb20gJy4vbW9kdWxlLmpzb24nIHdpdGggeyB0eXBlOiAnanNvbicgfTtcblxuLy8gQVRURU5USU9OIVxuLy8gUGxlYXNlIG1vZGlmeSB0aGUgYmVsb3cgdmFyaWFibGVzOiBzX1NWRUxURV9IQVNIX0lEIGFwcHJvcHJpYXRlbHkuXG5cbmNvbnN0IHNfUEFDS0FHRV9JRCA9IGBtb2R1bGVzLyR7bW9kdWxlSlNPTi5pZH1gO1xuXG4vLyBBIHNob3J0IGFkZGl0aW9uYWwgc3RyaW5nIHRvIGFkZCB0byBTdmVsdGUgQ1NTIGhhc2ggdmFsdWVzIHRvIG1ha2UgeW91cnMgdW5pcXVlLiBUaGlzIHJlZHVjZXMgdGhlIGFtb3VudCBvZlxuLy8gZHVwbGljYXRlZCBmcmFtZXdvcmsgQ1NTIG92ZXJsYXAgYmV0d2VlbiBtYW55IFRSTCBwYWNrYWdlcyBlbmFibGVkIG9uIEZvdW5kcnkgVlRUIGF0IHRoZSBzYW1lIHRpbWUuXG5jb25zdCBzX1NWRUxURV9IQVNIX0lEID0gJ2F1dG8nO1xuXG5jb25zdCBzX0NPTVBSRVNTID0gZmFsc2U7ICAvLyBTZXQgdG8gdHJ1ZSB0byBjb21wcmVzcyB0aGUgbW9kdWxlIGJ1bmRsZS5cbmNvbnN0IHNfU09VUkNFTUFQUyA9IHRydWU7IC8vIEdlbmVyYXRlIHNvdXJjZW1hcHMgZm9yIHRoZSBidW5kbGUgKHJlY29tbWVuZGVkKS5cblxuZXhwb3J0IGRlZmF1bHQgKHsgbW9kZSB9KSA9Plxue1xuICAgLy8gUHJvdmlkZXMgYSBjdXN0b20gaGFzaCBhZGRpbmcgdGhlIHN0cmluZyBkZWZpbmVkIGluIGBzX1NWRUxURV9IQVNIX0lEYCB0byBzY29wZWQgU3ZlbHRlIHN0eWxlcztcbiAgIC8vIFRoaXMgaXMgcmVhc29uYWJsZSB0byBkbyBhcyB0aGUgZnJhbWV3b3JrIHN0eWxlcyBpbiBUUkwgY29tcGlsZWQgYWNyb3NzIGBuYCBkaWZmZXJlbnQgcGFja2FnZXMgd2lsbFxuICAgLy8gYmUgdGhlIHNhbWUuIFNsaWdodGx5IG1vZGlmeWluZyB0aGUgaGFzaCBlbnN1cmVzIHRoYXQgeW91ciBwYWNrYWdlIGhhcyB1bmlxdWVseSBzY29wZWQgc3R5bGVzIGZvciBhbGxcbiAgIC8vIFRSTCBjb21wb25lbnRzIGFuZCBtYWtlcyBpdCBlYXNpZXIgdG8gcmV2aWV3IHN0eWxlcyBpbiB0aGUgYnJvd3NlciBkZWJ1Z2dlci5cbiAgIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/IHtcbiAgICAgIGNzc0hhc2g6ICh7IGhhc2gsIGNzcyB9KSA9PiBgc3ZlbHRlLSR7c19TVkVMVEVfSEFTSF9JRH0tJHtoYXNoKGNzcyl9YFxuICAgfSA6IHt9O1xuXG4gICAvKiogQHR5cGUge2ltcG9ydCgndml0ZScpLlVzZXJDb25maWd9ICovXG4gICByZXR1cm4ge1xuICAgICAgcm9vdDogJ3NyYy8nLCAgICAgICAgICAgICAgICAgICAgLy8gU291cmNlIGxvY2F0aW9uIC8gZXNidWlsZCByb290LlxuICAgICAgYmFzZTogYC8ke3NfUEFDS0FHRV9JRH0vZGlzdGAsICAgLy8gQmFzZSBtb2R1bGUgcGF0aCB0aGF0IDMwMDAxIC8gc2VydmVkIGRldiBkaXJlY3RvcnkuXG4gICAgICBwdWJsaWNEaXI6IGZhbHNlLCAgICAgICAgICAgICAgICAvLyBObyBwdWJsaWMgcmVzb3VyY2VzIHRvIGNvcHkuXG4gICAgICBjYWNoZURpcjogJy4uLy52aXRlLWNhY2hlJywgICAgICAvLyBSZWxhdGl2ZSBmcm9tIHJvb3QgZGlyZWN0b3J5LlxuXG4gICAgICByZXNvbHZlOiB7IGNvbmRpdGlvbnM6IFsnYnJvd3NlcicsICdpbXBvcnQnXSB9LFxuXG4gICAgICBlc2J1aWxkOiB7XG4gICAgICAgICB0YXJnZXQ6IFsnZXMyMDIyJ11cbiAgICAgIH0sXG5cbiAgICAgIGNzczoge1xuICAgICAgICAgLy8gQ3JlYXRlcyBhIHN0YW5kYXJkIGNvbmZpZ3VyYXRpb24gZm9yIFBvc3RDU1Mgd2l0aCBhdXRvcHJlZml4ZXIgJiBwb3N0Y3NzLXByZXNldC1lbnYuXG4gICAgICAgICBwb3N0Y3NzOiBwb3N0Y3NzQ29uZmlnKHsgY29tcHJlc3M6IHNfQ09NUFJFU1MsIHNvdXJjZU1hcDogc19TT1VSQ0VNQVBTIH0pXG4gICAgICB9LFxuXG4gICAgICAvLyBBYm91dCBzZXJ2ZXIgb3B0aW9uczpcbiAgICAgIC8vIC0gU2V0IHRvIGBvcGVuYCB0byBib29sZWFuIGBmYWxzZWAgdG8gbm90IG9wZW4gYSBicm93c2VyIHdpbmRvdyBhdXRvbWF0aWNhbGx5LiBUaGlzIGlzIHVzZWZ1bCBpZiB5b3Ugc2V0IHVwIGFcbiAgICAgIC8vIGRlYnVnZ2VyIGluc3RhbmNlIGluIHlvdXIgSURFIGFuZCBsYXVuY2ggaXQgd2l0aCB0aGUgVVJMOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwMS9nYW1lJy5cbiAgICAgIC8vXG4gICAgICAvLyAtIFRoZSB0b3AgcHJveHkgZW50cnkgcmVkaXJlY3RzIHJlcXVlc3RzIHVuZGVyIHRoZSBtb2R1bGUgcGF0aCBmb3IgYHN0eWxlLmNzc2AgYW5kIGZvbGxvd2luZyBzdGFuZGFyZCBzdGF0aWNcbiAgICAgIC8vIGRpcmVjdG9yaWVzOiBgYXNzZXRzYCwgYGxhbmdgLCBhbmQgYHBhY2tzYCBhbmQgd2lsbCBwdWxsIHRob3NlIHJlc291cmNlcyBmcm9tIHRoZSBtYWluIEZvdW5kcnkgLyAzMDAwMCBzZXJ2ZXIuXG4gICAgICAvLyBUaGlzIGlzIG5lY2Vzc2FyeSB0byByZWZlcmVuY2UgdGhlIGRldiByZXNvdXJjZXMgYXMgdGhlIHJvb3QgaXMgYC9zcmNgIGFuZCB0aGVyZSBpcyBubyBwdWJsaWMgLyBzdGF0aWNcbiAgICAgIC8vIHJlc291cmNlcyBzZXJ2ZWQgd2l0aCB0aGlzIHBhcnRpY3VsYXIgVml0ZSBjb25maWd1cmF0aW9uLiBNb2RpZnkgdGhlIHByb3h5IHJ1bGUgYXMgbmVjZXNzYXJ5IGZvciB5b3VyXG4gICAgICAvLyBzdGF0aWMgcmVzb3VyY2VzIC8gcHJvamVjdC5cbiAgICAgIHNlcnZlcjoge1xuICAgICAgICAgcG9ydDogMzAwMDEsXG4gICAgICAgICBvcGVuOiAnL2dhbWUnLFxuICAgICAgICAgcHJveHk6IHtcbiAgICAgICAgICAgIC8vIFNlcnZlcyBzdGF0aWMgZmlsZXMgZnJvbSBtYWluIEZvdW5kcnkgc2VydmVyLlxuICAgICAgICAgICAgW2BeKC8ke3NfUEFDS0FHRV9JRH0vKGFzc2V0c3xsYW5nfHBhY2tzfHN0eWxlLmNzcykpYF06ICdodHRwOi8vbG9jYWxob3N0OjMwMDAwJyxcblxuICAgICAgICAgICAgLy8gQWxsIG90aGVyIHBhdGhzIGJlc2lkZXMgcGFja2FnZSBJRCBwYXRoIGFyZSBzZXJ2ZWQgZnJvbSBtYWluIEZvdW5kcnkgc2VydmVyLlxuICAgICAgICAgICAgW2BeKD8hLyR7c19QQUNLQUdFX0lEfS8pYF06ICdodHRwOi8vbG9jYWxob3N0OjMwMDAwJyxcblxuICAgICAgICAgICAgLy8gUmV3cml0ZSBpbmNvbWluZyBgbW9kdWxlLWlkLmpzYCByZXF1ZXN0IGZyb20gRm91bmRyeSB0byB0aGUgZGV2IHNlcnZlciBgaW5kZXguanNgLlxuICAgICAgICAgICAgW2AvJHtzX1BBQ0tBR0VfSUR9L2Rpc3QvJHttb2R1bGVKU09OLmlkfS5qc2BdOiB7XG4gICAgICAgICAgICAgICB0YXJnZXQ6IGBodHRwOi8vbG9jYWxob3N0OjMwMDAxLyR7c19QQUNLQUdFX0lEfS9kaXN0YCxcbiAgICAgICAgICAgICAgIHJld3JpdGU6ICgpID0+ICcvaW5kZXguanMnLFxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gRW5hYmxlIHNvY2tldC5pbyBmcm9tIG1haW4gRm91bmRyeSBzZXJ2ZXIuXG4gICAgICAgICAgICAnL3NvY2tldC5pbyc6IHsgdGFyZ2V0OiAnd3M6Ly9sb2NhbGhvc3Q6MzAwMDAnLCB3czogdHJ1ZSB9XG4gICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBidWlsZDoge1xuICAgICAgICAgb3V0RGlyOiAnLi4vZGlzdCcsXG4gICAgICAgICBlbXB0eU91dERpcjogZmFsc2UsXG4gICAgICAgICBzb3VyY2VtYXA6IHNfU09VUkNFTUFQUyxcbiAgICAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgICAgICBtaW5pZnk6IHNfQ09NUFJFU1MgPyAndGVyc2VyJyA6IGZhbHNlLFxuICAgICAgICAgdGFyZ2V0OiBbJ2VzMjAyMiddLFxuICAgICAgICAgdGVyc2VyT3B0aW9uczogc19DT01QUkVTUyA/IHsgLi4udGVyc2VyQ29uZmlnKCksIGVjbWE6IDIwMjIgfSA6IHZvaWQgMCxcbiAgICAgICAgIGxpYjoge1xuICAgICAgICAgICAgZW50cnk6ICcuL2luZGV4LmpzJyxcbiAgICAgICAgICAgIGZvcm1hdHM6IFsnZXMnXSxcbiAgICAgICAgICAgIGZpbGVOYW1lOiBtb2R1bGVKU09OLmlkXG4gICAgICAgICB9LFxuICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAvLyBSZXdyaXRlIHRoZSBkZWZhdWx0IHN0eWxlLmNzcyB0byBhIG1vcmUgcmVjb2duaXphYmxlIGZpbGUgbmFtZS5cbiAgICAgICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PlxuICAgICAgICAgICAgICAgIGFzc2V0SW5mby5uYW1lID09PSAnc3R5bGUuY3NzJyA/IGAke21vZHVsZUpTT04uaWR9LmNzc2AgOiBhc3NldEluZm8ubmFtZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICAvLyBOZWNlc3Nhcnkgd2hlbiB1c2luZyB0aGUgZGV2IHNlcnZlciBmb3IgdG9wLWxldmVsIGF3YWl0IHVzYWdlIGluc2lkZSBUUkwuXG4gICAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICAgICAgICB0YXJnZXQ6ICdlczIwMjInXG4gICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBwbHVnaW5zOiBbXG4gICAgICAgICBzdmVsdGUoe1xuICAgICAgICAgICAgY29tcGlsZXJPcHRpb25zLFxuICAgICAgICAgICAgcHJlcHJvY2Vzczogc3ZlbHRlUHJlcHJvY2VzcygpXG4gICAgICAgICB9KSxcbiAgICAgIF1cbiAgIH07XG59O1xuIiwgIntcblx0XCJpZFwiOiBcImF1dG9hbmltYXRpb25zXCIsXG5cdFwidGl0bGVcIjogXCJBdXRvbWF0ZWQgQW5pbWF0aW9uc1wiLFxuXHRcImRlc2NyaXB0aW9uXCI6IFwiVGhpcyB3aWxsIGF1dG9tYXRpY2FsbHkgcnVuIG1vc3QgSkIyQSBBbmltYXRpb25zIHN1Y2ggYXMgTWVsZWUvUmFuZ2VkIEF0dGFja3MsIFNwZWxsIEF0dGFja3MsIGFuZCBJbnN0YW50IFNwZWxsc1wiLFxuXHRcImF1dGhvcnNcIjogW1xuXHRcdHtcblx0XHRcdFwibmFtZVwiOiBcInRoZXJpcHBlcjkzXCIsXG5cdFx0XHRcImVtYWlsXCI6IFwidHNwbGFiQGdtYWlsLmNvbVwiLFxuXHRcdFx0XCJ1cmxcIjogXCJodHRwczovL3d3dy5wYXRyZW9uLmNvbS90aGVyaXBwZXI5M1wiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRcIm5hbWVcIjogXCJPdGlnb24gKE90aWdvbiMyMDEwKVwiLFxuXHRcdFx0XCJkaXNjb3JkXCI6IFwiT3RpZ29uIzIwMTBcIlxuXHRcdH1cblx0XSxcblx0XCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vdGhlcmlwcGVyOTMvYXV0b2FuaW1hdGlvbnNcIixcblx0XCJ2ZXJzaW9uXCI6IFwiNi4wLjBcIixcblx0XCJjb21wYXRpYmlsaXR5XCI6IHtcblx0XHRcIm1pbmltdW1cIjogXCIxM1wiLFxuXHRcdFwidmVyaWZpZWRcIjogXCIxM1wiXG5cdH0sXG5cdFwic2NyaXB0c1wiOiBbXSxcblx0XCJlc21vZHVsZXNcIjogW1xuXHRcdFwiZGlzdC9hdXRvYW5pbWF0aW9ucy5qc1wiXG5cdF0sXG5cdFwic3R5bGVzXCI6IFtcblx0XHRcImRpc3QvYXV0b2FuaW1hdGlvbnMuY3NzXCJcblx0XSxcblx0XCJmbGFnc1wiOiB7XG5cdFx0XCJob3RSZWxvYWRcIjoge1xuXHRcdFx0XCJleHRlbnNpb25zXCI6IFtcImpzb25cIl0sXG5cdFx0XHRcInBhdGhzXCI6IFtcImxhbmdcIl1cblx0XHR9XG5cdH0sXG5cdFwibGFuZ3VhZ2VzXCI6IFtcblx0XHR7XG5cdFx0XHRcImxhbmdcIjogXCJlblwiLFxuXHRcdFx0XCJuYW1lXCI6IFwiRW5nbGlzaFwiLFxuXHRcdFx0XCJwYXRoXCI6IFwibGFuZy9lbi5qc29uXCJcblx0XHR9LFxuXHRcdHtcblx0XHRcdFwibGFuZ1wiOiBcImVzXCIsXG5cdFx0XHRcIm5hbWVcIjogXCJFc3BhXHUwMEYxb2xcIixcblx0XHRcdFwicGF0aFwiOiBcImxhbmcvZXMuanNvblwiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRcImxhbmdcIjogXCJpdFwiLFxuXHRcdFx0XCJuYW1lXCI6IFwiSXRhbGlhbm9cIixcblx0XHRcdFwicGF0aFwiOiBcImxhbmcvaXQuanNvblwiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRcImxhbmdcIjogXCJrb1wiLFxuXHRcdFx0XCJuYW1lXCI6IFwiS29yZWFuXCIsXG5cdFx0XHRcInBhdGhcIjogXCJsYW5nL2tvLmpzb25cIlxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0XCJsYW5nXCI6IFwiamFcIixcblx0XHRcdFwibmFtZVwiOiBcIlx1NjVFNVx1NjcyQ1x1OEE5RVwiLFxuXHRcdFx0XCJwYXRoXCI6IFwibGFuZy9qYS5qc29uXCJcblx0XHR9LFxuXHRcdHtcblx0XHRcdFwibGFuZ1wiOiBcImZyXCIsXG5cdFx0XHRcIm5hbWVcIjogXCJGcmFuXHUwMEU3YWlzXCIsXG5cdFx0XHRcInBhdGhcIjogXCJsYW5nL2ZyLmpzb25cIlxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0XCJsYW5nXCI6IFwicHQtQlJcIixcblx0XHRcdFwibmFtZVwiOiBcIlBvcnR1Z3VcdTAwRUFzIChCcmFzaWwpXCIsXG5cdFx0XHRcInBhdGhcIjogXCJsYW5nL3B0LWJyLmpzb25cIlxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0XCJsYW5nXCI6IFwiZGVcIixcblx0XHRcdFwibmFtZVwiOiBcIkRldXRzY2hcIixcblx0XHRcdFwicGF0aFwiOiBcImxhbmcvZGUuanNvblwiXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRcImxhbmdcIjogXCJ6aC10d1wiLFxuXHRcdFx0XCJuYW1lXCI6IFwiXHU2QjYzXHU5QUQ0XHU0RTJEXHU2NTg3XCIsXG5cdFx0XHRcInBhdGhcIjogXCJsYW5nL3poLXR3Lmpzb25cIlxuXHRcdH0sXG4gICAge1xuXHRcdFx0XCJsYW5nXCI6IFwiY3NcIixcblx0XHRcdFwibmFtZVwiOiBcIlx1MDEwQ2VcdTAxNjF0aW5hXCIsXG5cdFx0XHRcInBhdGhcIjogXCJsYW5nL2NzLmpzb25cIlxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0XCJsYW5nXCI6IFwiY25cIixcblx0XHRcdFwibmFtZVwiOiBcIlx1NEUyRFx1NjU4N1x1RkYwOFx1N0I4MFx1NEY1M1x1RkYwOVwiLFxuXHRcdFx0XCJwYXRoXCI6IFwibGFuZy96aF9IYW5zLmpzb25cIlxuXHRcdH1cblx0XSxcblx0XCJyZWxhdGlvbnNoaXBzXCI6IHtcblx0XHRcInJlcXVpcmVzXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJpZFwiOiBcInNlcXVlbmNlclwiLFxuXHRcdFx0XHRcInR5cGVcIjogXCJtb2R1bGVcIixcblx0XHRcdFx0XCJtYW5pZmVzdFwiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9mYW50YXN5Y2FsZW5kYXIvRm91bmRyeVZUVC1TZXF1ZW5jZXIvcmVsZWFzZXMvbGF0ZXN0L2Rvd25sb2FkL21vZHVsZS5qc29uXCJcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwiaWRcIjogXCJzb2NrZXRsaWJcIixcblx0XHRcdFx0XCJ0eXBlXCI6IFwibW9kdWxlXCJcblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdFwic29ja2V0XCI6IHRydWUsXG5cdFwibWFuaWZlc3RcIjogXCJodHRwczovL2dpdGh1Yi5jb20vb3RpZ29uL2F1dG9tYXRlZC1qYjJhLWFuaW1hdGlvbnMvcmVsZWFzZXMvbGF0ZXN0L2Rvd25sb2FkL21vZHVsZS5qc29uXCIsXG5cdFwiZG93bmxvYWRcIjogXCJodHRwczovL2dpdGh1Yi5jb20vb3RpZ29uL2F1dG9tYXRlZC1qYjJhLWFuaW1hdGlvbnMvcmVsZWFzZXMvZG93bmxvYWQvMC42LjcxL21vZHVsZS56aXBcIlxufVxuIl0sCiAgIm1hcHBp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
