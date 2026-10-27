// OCR com o framework Vision do macOS (sem dependências externas).
// Compilar: swiftc -O scripts/acervo/ocr.swift -o scripts/acervo/.ocr
// Uso: .ocr pagina1.png pagina2.png …  → texto de cada imagem na saída padrão, separado por \f
import Foundation
import Vision
import AppKit

func ocr(_ path: String) -> String {
  guard let img = NSImage(contentsOfFile: path),
        let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return "" }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.recognitionLanguages = ["pt-BR", "en-US"]
  req.usesLanguageCorrection = true
  try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
  // Fotos de papel curvado: cada fragmento tem sua própria inclinação. Um fragmento entra na linha cuja reta
  // (último fragmento + inclinação) passa pela sua altura, medida no x dele; depois as linhas são ordenadas
  // pela altura no centro da página.
  struct Frag { let x0, x1, y0, y1, h: CGFloat; let t: String }
  struct Line { var frags: [Frag]; var slope: CGFloat
    func y(at x: CGFloat) -> CGFloat {
      let f = frags.min { abs(($0.x0 + $0.x1) / 2 - x) < abs(($1.x0 + $1.x1) / 2 - x) }!
      return x < f.x0 ? f.y0 + slope * (x - f.x0) : x > f.x1 ? f.y1 + slope * (x - f.x1) : f.y0 + (f.y1 - f.y0) * (x - f.x0) / max(f.x1 - f.x0, 1e-6)
    }
  }
  let frags = (req.results ?? []).compactMap { o -> Frag? in
    guard let t = o.topCandidates(1).first?.string else { return nil }
    let h = o.topLeft.y - o.bottomLeft.y
    return Frag(x0: o.bottomLeft.x, x1: o.bottomRight.x, y0: o.bottomLeft.y + h / 2, y1: o.bottomRight.y + h / 2, h: h, t: t)
  }
  var lines: [Line] = []
  // fragmentos largos primeiro: definem melhor a inclinação de cada linha
  for f in frags.sorted(by: { $0.x1 - $0.x0 > $1.x1 - $1.x0 }) {
    let best = lines.indices.map { ($0, abs(lines[$0].y(at: f.x0) - f.y0)) }.min { $0.1 < $1.1 }
    if let (i, d) = best, d < f.h * 0.45 {
      lines[i].frags.append(f)
    } else {
      let w = f.x1 - f.x0
      lines.append(Line(frags: [f], slope: w > 0.05 ? (f.y1 - f.y0) / w : 0))
    }
  }
  return lines.sorted { $0.y(at: 0.5) > $1.y(at: 0.5) }
    .map { $0.frags.sorted { $0.x0 < $1.x0 }.map(\.t).joined(separator: " ") }.joined(separator: "\n")
}

let out = CommandLine.arguments.dropFirst().map(ocr).joined(separator: "\n\u{0C}\n")
print(out)
