// OCR de PDF com o Vision do macOS. Uso: ocr arquivo.pdf > saida.txt
// Cada linha sai como "y<TAB>texto" (y em pontos a partir do topo da página); páginas separadas por \f
import Foundation
import PDFKit
import Vision

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let doc = PDFDocument(url: url) else { exit(1) }
for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let box = page.bounds(for: .mediaBox)
    let scale: CGFloat = 3
    let w = Int(box.width * scale), h = Int(box.height * scale)
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.recognitionLanguages = ["pt-BR"]
    req.usesLanguageCorrection = true
    try? VNImageRequestHandler(cgImage: ctx.makeImage()!).perform([req])
    // ordena de cima para baixo (y do Vision cresce para cima), depois da esquerda para a direita
    let obs = (req.results ?? []).sorted {
        abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.006 ? $0.boundingBox.midY > $1.boundingBox.midY : $0.boundingBox.minX < $1.boundingBox.minX
    }
    var lines: [String] = []
    for o in obs { if let s = o.topCandidates(1).first?.string { lines.append(String(format: "%.0f\t", (1 - o.boundingBox.midY) * box.height) + s) } }
    print(lines.joined(separator: "\n"))
    if i < doc.pageCount - 1 { print("\u{0C}") }
}
