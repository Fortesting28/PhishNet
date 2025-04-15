from detection.analyzer import EmailAnalyzer

def analyze_email(email_content, email_subject):
    analyzer = EmailAnalyzer()
    is_phishing = analyzer.analyze_email(email_content, email_subject)
    return "Phishing" if is_phishing else "Safe"

if __name__ == "__main__":
    # Example
    email_subject = "Urgent: Verify Your Account"
    email_content = """
    Dear User,

    We have noticed some suspicious activity on your account. Please verify your information immediately by clicking the link below:

    http://suspicious-link.com/verify

    Failure to do so may result in account suspension.

    Best regards,
    Security Team
    """

    result = analyze_email(email_content, email_subject)
    print(f"Email analysis result: {result}")
