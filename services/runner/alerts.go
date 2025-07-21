// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Alerting and email sending
// ----------------------------------------------------------------------------

package main

import (
	"bytes"
	"fmt"
	"log"
	"nanomon/services/common/monitor"
	"nanomon/services/common/result"
	"net/smtp"
	"os"
	"strconv"
	"text/template"
)

var (
	from    string
	pass    string
	to      string
	host    string
	port    string
	linkURL string

	emailTemplate *template.Template
)

func init() {
	from = os.Getenv("ALERT_SMTP_FROM")
	pass = os.Getenv("ALERT_SMTP_PASSWORD")
	to = os.Getenv("ALERT_SMTP_TO")
	host = os.Getenv("ALERT_SMTP_HOST")
	port = os.Getenv("ALERT_SMTP_PORT")
	baseURL := os.Getenv("ALERT_LINK_BASEURL")

	if host == "" {
		host = "smtp.gmail.com"
	}

	if port == "" {
		port = "587"
	}

	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}

	linkURL = fmt.Sprintf("%s/#monitor/", baseURL)

	// Load email template
	var err error

	emailTemplate, err = template.ParseFiles("templates/alert.html")
	if err != nil {
		log.Printf("Error loading email template: %s", err)
		log.Printf("Warning! Email alerting will be disabled!")
	}
}

// checkForAlerts checks if a monitor has failed and sends an alert email if necessary
func checkForAlerts(m *monitor.Monitor, r *result.Result) {
	maxFailCount := 3
	maxFailCountEnv := os.Getenv("ALERT_FAIL_COUNT")

	if maxFailCountEnv != "" {
		maxFailCount, _ = strconv.Atoi(maxFailCountEnv)
	}

	// Monitor hasn't failed, nothing to do!
	if m.ErrorCount <= 0 {
		return
	}

	log.Printf("  Monitor '%s' has failed %d times...", m.Name, m.ErrorCount)

	alertData := struct {
		Monitor *monitor.Monitor
		Result  result.Result
		LinkURL string
	}{
		Monitor: m,
		Result:  *r,
		LinkURL: linkURL,
	}

	if m.ErrorCount >= maxFailCount && !m.InErrorState {
		if emailTemplate != nil {
			w := &bytes.Buffer{}
			err := emailTemplate.Execute(w, alertData)
			body := w.String()

			if err != nil {
				log.Printf("  Error executing email template: %s", err)
				return
			}

			sendEmail(body, fmt.Sprintf("NanoMon alert for: %s", m.Name))
		}

		m.InErrorState = true
	}
}

// sendEmail sends an email alert using the configured SMTP settings
func sendEmail(body, subject string) {
	// Alerting is not configured and disabled
	if !IsAlertingEnabled() {
		log.Printf("  Alerting is disabled")
		return
	}

	log.Printf("  Sending email alert")

	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	subjectLine := "Subject: " + subject + "\n"
	msg := []byte(subjectLine + mime + "\n" + body)

	auth := smtp.PlainAuth("", from, pass, host)

	err := smtp.SendMail(host+":"+port, auth, from, []string{to}, []byte(msg))
	if err != nil {
		log.Printf("Alert SMTP error: %s", err)
		return
	}

	log.Printf("  Alert email was sent!")
}

func IsAlertingEnabled() bool {
	return from != "" && pass != "" && to != "" && emailTemplate != nil
}
