import SwiftUI
import WebKit

@main
struct ReaderApp: App {
    var body: some Scene {
        WindowGroup {
            ReaderScreen()
                .background(Color(red: 0.97, green: 0.98, blue: 0.96).ignoresSafeArea())
        }
    }
}

struct ReaderScreen: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> ReaderController { ReaderController() }
    func updateUIViewController(_ controller: ReaderController, context: Context) {}
}

private let readerHome = URL(string: "knowaiedge://reader/index.html")!

final class BundleHandler: NSObject, WKURLSchemeHandler {
    private let types = ["index.html": "text/html", "reader.css": "text/css",
                         "app.js": "application/javascript", "model.js": "application/javascript",
                         "edition.js": "application/javascript"]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == "reader",
              let type = types[String(url.path.dropFirst())],
              let file = Bundle.main.url(forResource: url.lastPathComponent, withExtension: nil, subdirectory: "web"),
              let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        task.didReceive(URLResponse(url: url, mimeType: type, expectedContentLength: data.count, textEncodingName: "utf-8"))
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class FeedHandler: NSObject, WKScriptMessageHandlerWithReply {
    private let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false
        config.timeoutIntervalForRequest = 12
        config.timeoutIntervalForResource = 20
        return URLSession(configuration: config)
    }()

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url == readerHome,
              let key = message.body as? String, ["news", "repositories", "watchlist"].contains(key),
              let url = URL(string: "https://knowaiedge.fyi/api/" + key) else {
            replyHandler(nil, "Unknown feed")
            return
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        session.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                guard error == nil, (response as? HTTPURLResponse)?.statusCode == 200,
                      let data, data.count <= 8_000_000, let json = String(data: data, encoding: .utf8) else {
                    replyHandler(nil, "Feed unavailable")
                    return
                }
                replyHandler(json, nil)
            }
        }.resume()
    }
}

final class ReaderController: UIViewController, WKNavigationDelegate {
    override func loadView() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleHandler(), forURLScheme: "knowaiedge")
        config.userContentController.addScriptMessageHandler(FeedHandler(), contentWorld: .page, name: "feed")
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.scrollView.contentInsetAdjustmentBehavior = .never
        view = web
        web.load(URLRequest(url: readerHome))
    }

    private func isExternal(_ url: URL) -> Bool {
        url.scheme?.lowercased() == "https" && url.host != nil && url.user == nil && url.password == nil
    }

    func webView(_ web: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if url == readerHome && action.targetFrame?.isMainFrame == true {
            decisionHandler(.allow)
            return
        }
        decisionHandler(.cancel)
        guard action.sourceFrame.isMainFrame else { return }
        if url.scheme == "knowaiedge-share" && url.host == "item",
           let link = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "url" })?.value,
           let shared = URL(string: link), isExternal(shared) {
            let sheet = UIActivityViewController(activityItems: [shared], applicationActivities: nil)
            if let popover = sheet.popoverPresentationController {
                popover.sourceView = view
                popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.maxY - 44, width: 1, height: 1)
                popover.permittedArrowDirections = []
            }
            present(sheet, animated: true)
        } else if isExternal(url) {
            UIApplication.shared.open(url)
        }
    }
}
