package fyi.knowaiedge.reader;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class ReaderActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/index.html";
    private static final List<String> FEEDS = Arrays.asList("/api/news", "/api/repositories", "/api/watchlist");
    private static final List<String> ASSETS = Arrays.asList("/index.html", "/reader.css", "/edition.js", "/model.js", "/app.js");
    private WebView reader;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout host = new FrameLayout(this);
        host.setBackgroundColor(Color.rgb(24,70,58));
        host.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        reader = new WebView(this);
        reader.getSettings().setJavaScriptEnabled(true);
        reader.getSettings().setDomStorageEnabled(true);
        reader.getSettings().setAllowFileAccess(false);
        reader.getSettings().setAllowContentAccess(false);
        reader.setWebViewClient(new ReaderClient());
        host.addView(reader);
        setContentView(host);
        reader.loadUrl(HOME);
    }

    private static boolean isHTTPS(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null;
    }

    private class ReaderClient extends WebViewClient {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (HOME.equals(uri.toString())) return false;
            if (!request.isForMainFrame()) return true;
            try {
                if ("knowaiedge-share".equals(uri.getScheme()) && "item".equals(uri.getHost())) {
                    String link = uri.getQueryParameter("url");
                    if (link != null && isHTTPS(Uri.parse(link))) {
                        Intent share = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, link);
                        startActivity(Intent.createChooser(share, null));
                    }
                } else if (isHTTPS(uri)) {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                }
            } catch (ActivityNotFoundException e) {
                Toast.makeText(ReaderActivity.this, "No app can open this link.", Toast.LENGTH_SHORT).show();
            }
            return true;
        }

        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String path = uri.getPath();
            if (!isHTTPS(uri) || !HOST.equals(uri.getAuthority()) || !"GET".equals(request.getMethod()))
                return error(403, "Forbidden");
            try {
                if (FEEDS.contains(path)) return fetchFeed(path);
                if (ASSETS.contains(path)) {
                    String type = path.endsWith(".js") ? "application/javascript" : path.endsWith(".css") ? "text/css" : "text/html";
                    return new WebResourceResponse(type, "utf-8", getAssets().open(path.substring(1)));
                }
            } catch (IOException e) { return error(503, "Unavailable"); }
            return error(404, "Missing");
        }
    }

    private static WebResourceResponse fetchFeed(String path) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL("https://knowaiedge.fyi" + path).openConnection();
        try {
            conn.setConnectTimeout(12000);
            conn.setReadTimeout(12000);
            conn.setRequestProperty("Accept", "application/json");
            conn.setUseCaches(false);
            if (conn.getResponseCode() != 200) return error(503, "Unavailable");
            try (InputStream input = conn.getInputStream(); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    if (bytes.size() + count > 8000000) return error(502, "Feed too large");
                    bytes.write(buffer, 0, count);
                }
                return new WebResourceResponse("application/json", "utf-8", 200, "OK",
                    Collections.singletonMap("Cache-Control", "no-store"), new ByteArrayInputStream(bytes.toByteArray()));
            }
        } finally { conn.disconnect(); }
    }

    private static WebResourceResponse error(int code, String message) {
        return new WebResourceResponse("text/plain", "utf-8", code, message, Collections.emptyMap(),
                new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8)));
    }

    @Override public void onBackPressed() {
        reader.evaluateJavascript("window.readerBack ? window.readerBack() : false", result -> {
            if (!"true".equals(result)) finish();
        });
    }

    @Override protected void onDestroy() {
        ((android.view.ViewGroup) reader.getParent()).removeView(reader);
        reader.destroy();
        super.onDestroy();
    }
}
