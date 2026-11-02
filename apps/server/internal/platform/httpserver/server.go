// Package httpserver runs net/http with sane timeouts and graceful shutdown.
package httpserver

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type Server struct {
	srv *http.Server
	log *slog.Logger
}

func New(port int, handler http.Handler, log *slog.Logger) *Server {
	return &Server{
		log: log,
		srv: &http.Server{
			Addr:              fmt.Sprintf(":%d", port),
			Handler:           handler,
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       15 * time.Second,
			WriteTimeout:      15 * time.Second,
			IdleTimeout:       60 * time.Second,
		},
	}
}

// Run blocks until ctx is cancelled (Ctrl+C / SIGTERM), then drains in-flight requests.
func (s *Server) Run(ctx context.Context) error {
	errCh := make(chan error, 1)
	go func() {
		s.log.Info("http server listening", "addr", s.srv.Addr)
		if err := s.srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	s.log.Info("shutting down http server")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return s.srv.Shutdown(shutdownCtx)
}
