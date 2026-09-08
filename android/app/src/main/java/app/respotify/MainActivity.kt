package app.respotify

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent

/**
 * Host for the TypeScript engine in src/lib/spotify.
 * Spotify login is opened in Chrome Custom Tabs — never in this WebView.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var setup: LinearLayout
    private lateinit var urlField: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = 0xFF0B0E0C.toInt()

        val root = FrameLayout(this)
        setup = buildSetup()
        web = buildWebView()
        root.addView(web, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        root.addView(setup, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        setContentView(root)

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (web.visibility == View.VISIBLE && web.canGoBack()) web.goBack()
                    else finish()
                }
            },
        )

        val incoming = intent?.data
        val stored = prefsUrl()
        val xml = getString(R.string.engine_url).trim()
        when {
            incoming != null -> openEngine(incoming.toString())
            stored.isNotEmpty() -> openEngine(stored)
            xml.isNotEmpty() -> openEngine(xml)
            else -> showSetup()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val data = intent.data ?: return
        openEngine(data.toString())
    }

    private fun prefsUrl(): String =
        getSharedPreferences("respotify", MODE_PRIVATE).getString("engine_url", "") ?: ""

    private fun saveUrl(url: String) {
        getSharedPreferences("respotify", MODE_PRIVATE).edit().putString("engine_url", url).apply()
    }

    private fun showSetup() {
        web.visibility = View.GONE
        setup.visibility = View.VISIBLE
        urlField.setText(prefsUrl())
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun buildWebView(): WebView {
        val view = WebView(this)
        view.visibility = View.GONE
        view.setBackgroundColor(0xFF0B0E0C.toInt())
        CookieManager.getInstance().setAcceptCookie(true)
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        view.webViewClient =
            object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    val uri = request.url
                    val host = uri.host ?: return false
                    if (host.endsWith("accounts.spotify.com")) {
                        CustomTabsIntent.Builder().build().launchUrl(this@MainActivity, uri)
                        return true
                    }
                    return false
                }
            }
        return view
    }

    private fun isAllowedEngineUrl(url: String): Boolean {
        if (url.startsWith("https://")) return true
        if (!BuildConfig.DEBUG) return false
        if (!url.startsWith("http://")) return false
        val host = android.net.Uri.parse(url).host ?: return false
        return host == "localhost" ||
            host == "127.0.0.1" ||
            host == "10.0.2.2" ||
            host.endsWith(".local") ||
            host.startsWith("192.168.") ||
            host.startsWith("10.") ||
            host.startsWith("172.")
    }

    private fun openEngine(raw: String) {
        val url = raw.trim()
        if (!isAllowedEngineUrl(url)) {
            showSetup()
            return
        }
        saveUrl(url.substringBefore("/callback").trimEnd('/').let { base ->
            if (url.contains("/callback")) url else base
        })
        setup.visibility = View.GONE
        web.visibility = View.VISIBLE
        web.loadUrl(url)
    }

    private fun buildSetup(): LinearLayout {
        val pad = (24 * resources.displayMetrics.density).toInt()
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF0B0E0C.toInt())
            setPadding(pad, pad * 2, pad, pad)
        }
        val title = TextView(this).apply {
            text = "Respotify"
            textSize = 28f
            setTextColor(0xFFE9EEE9.toInt())
        }
        val hintView = TextView(this).apply {
            text = getString(R.string.engine_hint)
            textSize = 15f
            setTextColor(0xFF8F9A91.toInt())
            setPadding(0, pad / 2, 0, pad)
        }
        urlField = EditText(this).apply {
            this.hint = "https://…"
            setTextColor(0xFFE9EEE9.toInt())
            setHintTextColor(0xFF6B746E.toInt())
            setBackgroundColor(0xFF1C231E.toInt())
            setPadding(pad / 2, pad / 2, pad / 2, pad / 2)
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_URI
        }
        val go = Button(this).apply {
            text = getString(R.string.open)
            setBackgroundColor(0xFF6FBF86.toInt())
            setTextColor(0xFF06210F.toInt())
            setOnClickListener { openEngine(urlField.text.toString()) }
        }
        col.addView(title)
        col.addView(hintView)
        col.addView(urlField)
        col.addView(go)
        return col
    }
}
