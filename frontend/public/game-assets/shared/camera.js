// Camera permission itself cannot be cancelled by browsers. Retire late streams
// after a timeout so a permission answer cannot silently reopen a stopped camera.
window.ArenaCamera = {
  wait(promise, timeoutMs, message, retire = () => {}) {
    return new Promise((resolve, reject) => {
      let finished = false;
      const timer = setTimeout(() => {
        finished = true;
        reject(new Error(message));
      }, timeoutMs);
      Promise.resolve(promise).then(
        (value) => {
          if (finished) {
            retire(value);
            return;
          }
          finished = true;
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  },
  open(constraints) {
    return this.wait(
      navigator.mediaDevices.getUserMedia(constraints),
      12000,
      "Camera permission timed out. Allow camera access, then retry.",
      (stream) => stream.getTracks().forEach((track) => track.stop()),
    );
  },
};
