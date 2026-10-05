// Prints the text of a PDF, one page at a time, each page headed "=== page N ===" (1-based),
// so the source map can cite pages. Uses macOS PDFKit; no third-party tools.
//
//   swiftc -O scripts/sources/pdf2txt.swift -o <bin> && <bin> file.pdf > file.txt
import Foundation
import PDFKit

guard CommandLine.arguments.count == 2 else {
    FileHandle.standardError.write("usage: pdf2txt file.pdf\n".data(using: .utf8)!)
    exit(2)
}
guard let doc = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1])) else {
    FileHandle.standardError.write("cannot open \(CommandLine.arguments[1])\n".data(using: .utf8)!)
    exit(1)
}
var out = ""
for i in 0..<doc.pageCount {
    out += "=== page \(i + 1) ===\n"
    out += (doc.page(at: i)?.string ?? "") + "\n"
}
FileHandle.standardOutput.write(out.data(using: .utf8)!)
