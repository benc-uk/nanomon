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

	if from == "" || pass == "" || to == "" {
		return
	}

	msg := "From: " + from + "\n" +
		"To: " + to + "\n" +
		"Subject: " + subject + "\n\n" +
		body

	err := smtp.SendMail("smtp.gmail.com:587", smtp.PlainAuth("", from, pass, "smtp.gmail.com"),
		from, []string{to}, []byte(msg))
	if err != nil {
		log.Printf("### Alert SMTP error: %s", err)
		return
	}

	log.Printf("###   Alert email was sent!")
}
