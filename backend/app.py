from flask import Flask, request, jsonify
import requests
import json
import re
from dotenv import load_dotenv
from flask_cors import CORS

app = Flask(__name__)
load_dotenv()
CORS(app)

DEEPSEEK_API_URL = "http://localhost:11434/api/generate"

#detection Rules
PHISHING_KEYWORDS = [
    'urgent', 'verify', 'suspended', 'action required', 'security alert',
    'account closure', 'limited time', 'immediately', 'click here', 'password reset',
    'verify your account', 'unauthorized access', 'account locked'
]

SUSPICIOUS_DOMAINS = [
    'account-verify', 'security-update', 'login-verify',
    'gmail-verify', 'password-reset', 'secure-login',
    'update-info', 'confirm-identity'
]

IMPERSONATION_BRANDS = [
    'google', 'microsoft', 'apple', 'amazon', 'paypal',
    'bank', 'irs', 'government', 'netflix', 'facebook'
]

def rule_based_analysis(subject, content):
    """Perform initial rule-based phishing detection"""
    text = f"{subject} {content}".lower()
    reasons = []
    score = 0
    found_keywords = [kw for kw in PHISHING_KEYWORDS if kw in text]
    if found_keywords:
        score += len(found_keywords)
        reasons.append(f"Phishing keywords: {', '.join(found_keywords)}")

    domains = re.findall(r'https?://([^\s/]+)', text)
    suspicious_domains = [d for d in domains if any(sd in d for sd in SUSPICIOUS_DOMAINS)]
    if suspicious_domains:
        score += len(suspicious_domains) * 2
        reasons.append(f"Suspicious domains: {', '.join(suspicious_domains)}")

    urgency_patterns = [
        r'\b24\s?hours?\b',
        r'\bimmediate\b',
        r'\bact\snow\b',
        r'\bexpir\w+\b',
        r'\blast\s?chance\b'
    ]
    urgency_matches = sum(len(re.findall(pattern, text)) for pattern in urgency_patterns)
    if urgency_matches:
        score += urgency_matches
        reasons.append(f"Urgency indicators found")

    impersonated_brands = [b for b in IMPERSONATION_BRANDS if b in text]
    if impersonated_brands and (found_keywords or suspicious_domains):
        score += len(impersonated_brands) * 2
        reasons.append(f"Possible impersonation of: {', '.join(impersonated_brands)}")
    
    return score, reasons

def analyze_email_with_deepseek(subject, content):
    """Use DeepSeek for more nuanced analysis"""
    prompt = f"""
    Analyze this email for phishing attempts. Consider these aspects:
    1. Urgency or threats (account suspension, limited time)
    2. Suspicious links or domains
    3. Requests for personal information
    4. Impersonation of trusted entities
    5. Grammar/spelling errors
    6. Mismatched sender/domain
    
    Return JSON format with classification and confidence:
    {{
        "classification": "Phishing" or "Safe",
        "confidence": "High", "Medium", or "Low",
        "reasons": ["list", "of", "reasons"]
    }}

    Email:
    Subject: {subject}
    Content: {content}
    """

    try:
        payload = {
            "model": "deepseek-r1:1.5b",
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        response = requests.post(DEEPSEEK_API_URL, json=payload, timeout=100)
        response.raise_for_status()

        response_json = response.json()
        print("DeepSeek API Response:", response_json)

        try:
            if isinstance(response_json, dict):
                result = response_json
            else:
                result_text = response_json.get("response", "").strip()
                result = json.loads(result_text)
            
            return result.get("classification", "Unknown"), result.get("confidence", "Low"), result.get("reasons", [])
        except Exception as e:
            print(f"Error parsing DeepSeek response: {e}")
            return "Unknown", "Low", ["Analysis failed"]
            
    except Exception as e:
        print(f"DeepSeek API error: {e}")
        return "Error", "Low", ["API request failed"]

@app.route('/analyze', methods=['POST'])
def analyze_email():
    data = request.json
    subject = data.get('subject', 'No Subject')
    content = data.get('content', 'No Content')

    if not subject or not content:
        return jsonify({"result": "Error", "message": "Missing email details"}), 400

    rule_score, rule_reasons = rule_based_analysis(subject, content)

    if rule_score >= 5:  #High confidence
        return jsonify({
            "result": "Phishing",
            "confidence": "High",
            "reasons": rule_reasons,
            "detection_method": "rule-based"
        })

    deepseek_class, confidence, deepseek_reasons = analyze_email_with_deepseek(subject, content)
    # Combine results
    if deepseek_class == "Phishing":
        all_reasons = rule_reasons + deepseek_reasons
        final_confidence = "High" if rule_score >= 3 else confidence
        return jsonify({
            "result": "Phishing",
            "confidence": final_confidence,
            "reasons": all_reasons,
            "detection_method": "hybrid"
        })
    else:
        if rule_score < 3:
            return jsonify({
                "result": "Safe",
                "confidence": "High",
                "reasons": ["No phishing indicators detected"],
                "detection_method": "hybrid"
            })
        else:
            return jsonify({
                "result": "Suspicious",
                "confidence": "Medium",
                "reasons": rule_reasons + ["AI analysis didn't confirm phishing"],
                "detection_method": "hybrid"
            })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
