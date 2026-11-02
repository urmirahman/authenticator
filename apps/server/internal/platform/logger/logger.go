// Package logger builds the app's structured logger (log/slog from the standard library).
package logger

import (
	"log/slog"
	"os"
)

func New(env string) *slog.Logger {
	var h slog.Handler
	if env == "production" {
		h = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	} else {
		h = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	}
	return slog.New(h)
}
