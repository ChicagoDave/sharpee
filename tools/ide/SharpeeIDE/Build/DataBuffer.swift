// DataBuffer.swift
// A thread-safe append-only byte buffer for draining a child process's pipes.
//
// WHY IT IS SHARED. Three runners in this app spawn children and read their
// output — Compose, Introspection, and World Index — and each one MUST drain
// while the child runs rather than after it exits. A pipe holds about 64KB; a
// child writing more blocks on the write, so a parent that waits for termination
// before reading is waiting on a process that cannot finish. That deadlock
// shipped once already, in the World Index runner, and stayed invisible for
// exactly as long as the analyzer's document happened to fit in the buffer.
//
// It lives here, beside ShellEnvironment, because subprocess plumbing this app
// shares belongs in one place rather than copied per runner — two copies is how
// two readers come to drain differently.
//
// Public interface: DataBuffer.append(_:), DataBuffer.data.
// Owner context: tools/ide — Build.

import Foundation

/// A tiny thread-safe append-only byte buffer for collecting pipe output off the
/// main actor before handing the bytes back at termination.
final class DataBuffer: @unchecked Sendable {
    private let lock = NSLock()
    private var storage = Data()

    /// Appends one chunk read from a pipe. Empty chunks are ignored.
    /// - Parameter chunk: the bytes just read
    func append(_ chunk: Data) {
        guard !chunk.isEmpty else { return }
        lock.lock(); storage.append(chunk); lock.unlock()
    }

    /// Everything collected so far.
    var data: Data {
        lock.lock(); defer { lock.unlock() }
        return storage
    }
}
