package com.celimap.app;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
  private volatile boolean pageReady = false;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
    splashScreen.setKeepOnScreenCondition(() -> !pageReady);

    super.onCreate(savedInstanceState);

    View content = findViewById(android.R.id.content);
    if (content != null) {
      content.setBackgroundColor(Color.parseColor("#0b1220"));
    }

    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView == null) {
      pageReady = true;
      return;
    }

    tuneWebView(webView);

    webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
      @Override
      public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
        super.onPageStarted(view, url, favicon);
        // Antes de que React monte: silencia InstallPrompt PWA
        injectNativeGuards(view);
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        injectNativeGuards(view);
        view.postDelayed(() -> pageReady = true, 250);
      }
    });

    // Fallback si la red falla / cuelga
    webView.postDelayed(() -> pageReady = true, 12000);
  }

  @SuppressLint("SetJavaScriptEnabled")
  private void tuneWebView(WebView webView) {
    WebSettings settings = webView.getSettings();
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
    settings.setMediaPlaybackRequiresUserGesture(false);
    webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
    webView.setBackgroundColor(Color.parseColor("#0b1220"));
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
  }

  /** Silencia prompt "Instalar Celimap" dentro de la app store (sin tocar webapp). */
  private void injectNativeGuards(WebView view) {
    String js =
      "(function(){try{"
      + "localStorage.setItem('pwa_install_prompt_dismissed_until_v2',String(Date.now()+315360000000));"
      + "localStorage.setItem('pwa_install_prompt_ios_guide_seen_v1','1');"
      + "try{Object.defineProperty(navigator,'standalone',{configurable:true,get:function(){return true}})}catch(e){}"
      + "}catch(e){}})();";
    view.evaluateJavascript(js, null);
  }
}
