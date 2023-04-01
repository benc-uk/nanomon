package monitor

import (
	"log"
	"net/smtp"
	"os"
)

func sendEmail(body, subject string) {
	from := os.Getenv("ALERT_SMTP_FROM")
	pass := os.Getenv("ALERT_SMTP_PASSWORD")
	to := os.Getenv("ALERT_SMTP_TO")
	host := os.Getenv("ALERT_SMTP_HOST")
	port := os.Getenv("ALERT_SMTP_PORT")

	if host == "" {
		host = "smtp.gmail.com"
	}
	if port == "" {
		port = "587"
	}

	if from == "" || pass == "" || to == "" {
		// Alerting is not configured and disabled
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
