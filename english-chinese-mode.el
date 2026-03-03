;;; english-chinese-mode.el --- Replace English words with Chinese characters -*- lexical-binding: t; -*-

;; Author: Assistant
;; Version: 1.0
;; Keywords: display, chinese, prettify

;;; Commentary:

;; This mode replaces certain English words with Chinese characters using
;; composition, similar to how org-mode handles pretty entities.
;;
;; Usage:
;;   M-x english-chinese-mode
;;   M-x toggle-english-chinese-display

;;; Code:

(defvar english-chinese-csv-files
  (list (expand-file-name "~/.mandarin-data/hsk1.csv")
        (expand-file-name "~/.mandarin-data/hsk2.csv"))
  "List of HSK CSV files containing Chinese vocabulary.")

(defvar english-chinese-word-alist nil
  "Alist of English words to Chinese characters.
Loaded dynamically from CSV file.")

(defvar english-pinyin-word-alist nil
  "Alist of English words to Pinyin.
Loaded dynamically from CSV file.")

(defun english-chinese-parse-csv-line (line)
  "Parse a CSV line and return (chinese pinyin english) or nil if invalid."
  (when (and line (not (string-empty-p line)))
    (let ((parts (split-string line "," t)))
      (when (>= (length parts) 3)
        (list (nth 0 parts) (nth 1 parts) (nth 2 parts))))))

(defun english-chinese-build-translation-map (english-word chinese-translations)
  "Build a simple English->Chinese mapping from English word and Chinese translations."
  (when (and english-word chinese-translations)
    (let ((simple-english (downcase (replace-regexp-in-string "[^a-zA-Z].*" "" english-word))))
      (when (not (string-empty-p simple-english))
        (list simple-english (car chinese-translations))))))

(defun english-chinese-load-vocabulary ()
  "Load vocabulary from HSK CSV files."
  (let ((chinese-alist '())
        (pinyin-alist '()))
    (dolist (csv-file english-chinese-csv-files)
      (when (file-exists-p csv-file)
        (with-temp-buffer
          (insert-file-contents csv-file)
          (goto-char (point-min))
          (while (not (eobp))
            (let* ((line (buffer-substring-no-properties
                         (line-beginning-position) (line-end-position)))
                   (parsed (english-chinese-parse-csv-line line)))
              (when parsed
                (let* ((chinese (nth 0 parsed))
                       (pinyin (nth 1 parsed))
                       (english (nth 2 parsed)))
                  ;; Use the full English translation as the key
                  (when (and english (not (string-empty-p english)))
                    (push (cons english chinese) chinese-alist)
                    (push (cons english pinyin) pinyin-alist)))))
            (forward-line 1)))))
    ;; Sort by English key length (longest first) to prioritize longer matches
    (setq english-chinese-word-alist
          (sort (nreverse chinese-alist)
                (lambda (a b) (> (length (car a)) (length (car b))))))
    (setq english-pinyin-word-alist
          (sort (nreverse pinyin-alist)
                (lambda (a b) (> (length (car a)) (length (car b))))))))

;; Load vocabulary when the mode is first loaded
(english-chinese-load-vocabulary)

;; Debug function to check loaded vocabulary
(defun english-chinese-debug-vocabulary ()
  "Show debug information about loaded vocabulary."
  (interactive)
  (dolist (csv-file english-chinese-csv-files)
    (message "CSV file exists: %s - %s" csv-file (file-exists-p csv-file)))
  (message "Chinese alist length: %d" (length english-chinese-word-alist))
  (message "Pinyin alist length: %d" (length english-pinyin-word-alist))
  (when english-chinese-word-alist
    (message "First 5 Chinese entries: %S" (seq-take english-chinese-word-alist 5)))
  (when english-pinyin-word-alist
    (message "First 5 Pinyin entries: %S" (seq-take english-pinyin-word-alist 5))))

(defvar english-chinese-display-mode nil
  "Display mode: nil (off), 'chinese (Chinese characters), or 'pinyin (Pinyin).")

(defvar english-chinese-idle-timer nil
  "Timer for restoring overlays after idle period.")

(defvar english-chinese-idle-delay 10
  "Seconds of idle time before restoring overlays.")

(defun english-chinese-remove-all-overlays ()
  "Remove all english-chinese overlays from buffer."
  (remove-overlays (point-min) (point-max) 'english-chinese-overlay t))

(defun english-chinese-restore-overlays ()
  "Restore overlays by re-enabling font-lock keywords."
  (when english-chinese-display-mode
    (font-lock-add-keywords nil '((english-chinese-fontify)))
    (font-lock-fontify-buffer)))

(defun english-chinese-on-change (beg end len)
  "Called when buffer changes. Remove overlays and disable fontification."
  (when english-chinese-display-mode
    (english-chinese-remove-all-overlays)
    ;; Temporarily disable font-lock keywords to prevent immediate re-fontification
    (font-lock-remove-keywords nil '((english-chinese-fontify)))
    (font-lock-flush)
    ;; Cancel existing timer
    (when english-chinese-idle-timer
      (cancel-timer english-chinese-idle-timer))
    ;; Start new timer to re-enable
    (setq english-chinese-idle-timer
          (run-with-idle-timer english-chinese-idle-delay nil
                              'english-chinese-restore-overlays))))

(defvar english-chinese-mode-map
  (make-sparse-keymap)
  "Keymap for english-chinese-mode.")

(defun english-chinese-fontify (limit)
  "Find English words to replace with Chinese characters or Pinyin up to LIMIT."
  (when english-chinese-display-mode
    (catch 'match
      (let* ((word-alist (if (eq english-chinese-display-mode 'chinese)
                            english-chinese-word-alist
                          english-pinyin-word-alist))
             (word-regexp (concat "\\b\\(?:"
                                 (mapconcat #'car word-alist "\\|")
                                 "\\)\\b")))
        (while (re-search-forward word-regexp limit t)
          (let* ((word (match-string 0))
                 (replacement (cdr (assoc word word-alist))))
            (when replacement
              (let ((start (match-beginning 0))
                    (end (match-end 0)))
                (add-text-properties start end
                                   '(font-lock-fontified t))
                ;; Use overlay with display property for both Chinese and Pinyin
                (let ((overlay (make-overlay start end)))
                  (overlay-put overlay 'display replacement)
                  (overlay-put overlay 'english-chinese-overlay t))
                (backward-char 1)
                (throw 'match t)))))
        nil))))

;;;###autoload
(defun cycle-english-chinese-display ()
  "Cycle through off -> Chinese -> Pinyin -> off."
  (interactive)
  (save-restriction
    (widen)
    (remove-overlays (point-min) (point-max) 'english-chinese-overlay t)
    (font-lock-remove-keywords nil '((english-chinese-fontify))))

  (setq-local english-chinese-display-mode
              (cond ((eq english-chinese-display-mode nil) 'chinese)
                    ((eq english-chinese-display-mode 'chinese) 'pinyin)
                    ((eq english-chinese-display-mode 'pinyin) nil)))

  (cond ((eq english-chinese-display-mode 'chinese)
         (font-lock-add-keywords nil '((english-chinese-fontify)))
         (add-hook 'after-change-functions 'english-chinese-on-change nil t)
         (font-lock-flush)
         (message "English words are now displayed as Chinese characters"))
        ((eq english-chinese-display-mode 'pinyin)
         (font-lock-add-keywords nil '((english-chinese-fontify)))
         (add-hook 'after-change-functions 'english-chinese-on-change nil t)
         (font-lock-flush)
         (message "English words are now displayed as Pinyin"))
        (t
         (remove-hook 'after-change-functions 'english-chinese-on-change t)
         (when english-chinese-idle-timer
           (cancel-timer english-chinese-idle-timer)
           (setq english-chinese-idle-timer nil))
         (font-lock-flush)
         (message "English words are now displayed normally"))))

;;;###autoload
(define-minor-mode english-chinese-mode
  "Minor mode to replace English words with Chinese characters or Pinyin."
  :lighter " En中"
  :keymap english-chinese-mode-map
  :group 'english-chinese
  (if english-chinese-mode
      (progn
        ;; Ensure vocabulary is loaded
        (unless (and english-chinese-word-alist english-pinyin-word-alist)
          (english-chinese-load-vocabulary))
        (setq-local english-chinese-display-mode nil)
        ;; If this buffer was configured to start in Chinese mode, activate it
        (when (memq major-mode '(org-mode python-mode rust-mode))
          (setq-local english-chinese-display-mode 'chinese)
          (font-lock-add-keywords nil '((english-chinese-fontify)))
          (add-hook 'after-change-functions 'english-chinese-on-change nil t)
          (font-lock-flush)
          (message "English-Chinese mode enabled with Chinese display"))
        (unless english-chinese-display-mode
          (message "English-Chinese mode enabled. Use SPC t t to cycle display modes")))
    (when english-chinese-display-mode
      (save-restriction
        (widen)
        (remove-overlays (point-min) (point-max) 'english-chinese-overlay t))
      (remove-hook 'after-change-functions 'english-chinese-on-change t)
      (when english-chinese-idle-timer
        (cancel-timer english-chinese-idle-timer)
        (setq english-chinese-idle-timer nil))
      (font-lock-remove-keywords nil '((english-chinese-fontify)))
      (font-lock-flush))
    (kill-local-variable 'english-chinese-display-mode)
    (message "English-Chinese mode disabled")))

(provide 'english-chinese-mode)
;;; english-chinese-mode.el ends here
