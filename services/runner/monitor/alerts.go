// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Alerting and email sending
// ----------------------------------------------------------------------------

package monitor

import (
	"fmt"
	"log"
	"nanomon/services/common/types"
	"net/smtp"
	"os"
	"strconv"
)

var (
	from string
	pass string
	to   string
	host string
	port string
)

func init() {
	from = os.Getenv("ALERT_SMTP_FROM")
	pass = os.Getenv("ALERT_SMTP_PASSWORD")
	to = os.Getenv("ALERT_SMTP_TO")
	host = os.Getenv("ALERT_SMTP_HOST")
	port = os.Getenv("ALERT_SMTP_PORT")

	if host == "" {
		host = "smtp.gmail.com"
	}

	if port == "" {
		port = "587"
	}
}

func checkForAlerts(m *Monitor, r types.Result) {
	maxFailCount := 3
	maxFailCountEnv := os.Getenv("ALERT_FAIL_COUNT")

	if maxFailCountEnv != "" {
		maxFailCount, _ = strconv.Atoi(maxFailCountEnv)
	}

	log.Printf("###   Monitor '%s' has failed %d times...", m.Name, m.ErrorCount)

	if m.ErrorCount >= maxFailCount && !m.InErrorState {
		// Email body
		body := fmt.Sprintf(`Monitor '%s' has failed %d times!
  - Reason:%s
  - When: %s

Configuration:
  - Target: %s
  - Type: %s
  - Interval: %s
  - Rule: %s
  - Properties: %+v`, m.Name, m.ErrorCount, r.Message, r.Date.Format("15:04 - 02/01/2006"),
			m.Target, m.Type, m.Interval, m.Rule, m.Properties)

		sendEmail(body, fmt.Sprintf("⚠️ NanoMon alert for: %s", m.Name))

		m.InErrorState = true
	}
}

func sendEmail(body, subject string) {
	// Alerting is not configured and disabled
	if !IsAlertingEnabled() {
		log.Printf("###   Alerting is disabled")
		return
	}

	log.Printf("###   Sending email alert")

	msg := "From: " + from + "\n" +
		"To: " + to + "\n" +
		"Subject: " + subject + "\n\n" +
		body

	err := smtp.SendMail(host+":"+port, smtp.PlainAuth("", from, pass, host),
		from, []string{to}, []byte(msg))
	if err != nil {
		log.Printf("### Alert SMTP error: %s", err)
		return
	}

	log.Printf("###   Alert email was sent!")
}

func IsAlertingEnabled() bool {
	return from != "" && pass != "" && to != ""
}
