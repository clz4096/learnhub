// Renders one page of a PDF to a PNG, for reading mathematics the text extraction garbles
// (graph/reviews/cambridge-batch-1.md, "Math that did not survive extraction"). Uses macOS
// PDFKit and AppKit; no third-party tools. Pages are 1-based; the scale defaults to 2.
//
//   swiftc -O scripts/sources/pdf2png.swift -o <bin> && <bin> file.pdf 12 page12.png [scale]
import AppKit
import Foundation
import PDFKit

let args = CommandLine.arguments
guard args.count == 4 || args.count == 5, let number = Int(args[2]), number >= 1 else {
    FileHandle.standardError.write("usage: pdf2png file.pdf page out.png [scale]\n".data(using: .utf8)!)
    exit(2)
}
guard let doc = PDFDocument(url: URL(fileURLWithPath: args[1])), let page = doc.page(at: number - 1) else {
    FileHandle.standardError.write("cannot open page \(number) of \(args[1])\n".data(using: .utf8)!)
    exit(1)
}
let scale = args.count == 5 ? (Double(args[4]) ?? 2.0) : 2.0
let box = page.bounds(for: .mediaBox)
let width = Int(box.width * scale)
let height = Int(box.height * scale)
guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4,
    hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
    let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    FileHandle.standardError.write("cannot allocate a \(width) × \(height) bitmap\n".data(using: .utf8)!)
    exit(1)
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
// PDF pages have no background of their own: paint white so the PNG reads like the page.
context.cgContext.setFillColor(NSColor.white.cgColor)
context.cgContext.fill(CGRect(x: 0, y: 0, width: width, height: height))
context.cgContext.scaleBy(x: scale, y: scale)
page.draw(with: .mediaBox, to: context.cgContext)
NSGraphicsContext.restoreGraphicsState()
guard let png = bitmap.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write("cannot encode the PNG\n".data(using: .utf8)!)
    exit(1)
}
do {
    try png.write(to: URL(fileURLWithPath: args[3]))
} catch {
    FileHandle.standardError.write("cannot write \(args[3]): \(error)\n".data(using: .utf8)!)
    exit(1)
}
