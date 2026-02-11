"""
Generate 50 mock virtual share allotment letters as PDFs.
Each letter is 1-2 pages, slightly different, with:
- Allotment date
- Number of virtual shares
- Strike price
- Some with accelerated vesting
- Different fictionary beneficiary
"""
import os
import random
from datetime import date, timedelta
from fpdf import FPDF
from faker import Faker

fake = Faker()
random.seed(42)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "mock_letters")
os.makedirs(OUTPUT_DIR, exist_ok=True)

COMPANY_NAMES = [
    "NovaTech Solutions GmbH",
    "Helios Digital AG",
    "Quantum Leap Ventures GmbH",
    "Alpine Innovation Labs AG",
    "Synapse Robotics GmbH",
]

VESTING_SCHEDULES = [
    ("4 years with a 1-year cliff", "1/48th of the Virtual Shares shall vest monthly after the Cliff Date"),
    ("4 years with a 6-month cliff", "1/48th of the Virtual Shares shall vest monthly after the Cliff Date"),
    ("3 years with a 1-year cliff", "1/36th of the Virtual Shares shall vest monthly after the Cliff Date"),
    ("5 years with a 1-year cliff", "1/60th of the Virtual Shares shall vest monthly after the Cliff Date"),
]

GOVERNING_LAWS = ["the laws of Germany", "the laws of Switzerland", "the laws of the State of Delaware, USA"]

LEAVER_PROVISIONS = [
    "In the event of a Good Leaver termination, all vested Virtual Shares shall be settled at fair market value within 90 days. Unvested Virtual Shares shall be forfeited without compensation.",
    "Upon termination as a Good Leaver, the Beneficiary shall retain all vested Virtual Shares. In the case of a Bad Leaver termination, all Virtual Shares (whether vested or unvested) shall be forfeited without compensation.",
    "In the event of termination, the classification as Good Leaver or Bad Leaver shall be determined by the Board of Directors in its sole discretion. Good Leavers retain vested shares; Bad Leavers forfeit all shares.",
]

NON_COMPETE_CLAUSES = [
    "The Beneficiary agrees to a non-compete period of 12 months following termination, during which the Beneficiary shall not engage in any business that directly competes with the Company.",
    "For a period of 6 months after the termination of the employment relationship, the Beneficiary shall refrain from soliciting clients or employees of the Company.",
    None,  # no non-compete
]

CONFIDENTIALITY_PARAGRAPHS = [
    "The Beneficiary acknowledges that the terms of this Agreement, including the number of Virtual Shares and the Strike Price, are strictly confidential. Disclosure to third parties (other than the Beneficiary's tax advisor or spouse) shall constitute a material breach of this Agreement.",
    "The existence and terms of this Virtual Share Agreement shall be treated as confidential information of the Company. The Beneficiary shall not disclose any terms herein without prior written consent of the Company.",
]


def generate_letter(index: int):
    company = random.choice(COMPANY_NAMES)
    beneficiary = fake.name()
    address = fake.address().replace("\n", ", ")
    allotment_date = date(2023, 1, 1) + timedelta(days=random.randint(0, 730))
    num_shares = random.choice([500, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000, 15000, 20000])
    strike_price = round(random.uniform(0.50, 25.00), 2)
    has_accelerated_vesting = random.random() < 0.35
    vesting_schedule, vesting_detail = random.choice(VESTING_SCHEDULES)
    governing_law = random.choice(GOVERNING_LAWS)
    leaver_provision = random.choice(LEAVER_PROVISIONS)
    non_compete = random.choice(NON_COMPETE_CLAUSES)
    confidentiality = random.choice(CONFIDENTIALITY_PARAGRAPHS)
    cliff_months = 12 if "1-year" in vesting_schedule else 6
    total_years = int(vesting_schedule[0])

    # Randomly vary some details
    exercise_window_days = random.choice([30, 60, 90, 180])
    board_approval_date = allotment_date - timedelta(days=random.randint(1, 30))
    employee_id = f"EMP-{random.randint(1000, 9999)}"

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=25)
    pdf.add_page()
    pdf.set_font("Helvetica", size=10)

    # Header
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, company, ln=True, align="C")
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, "Strictly Private & Confidential", ln=True, align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(8)

    # Title
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "VIRTUAL SHARE ALLOTMENT LETTER", ln=True, align="C")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"(Virtual Share Option Program - VSOP)", ln=True, align="C")
    pdf.ln(6)

    # Reference line
    pdf.set_font("Helvetica", size=9)
    pdf.cell(0, 5, f"Reference: VSOP-{allotment_date.year}-{index+1:04d}    |    Employee ID: {employee_id}", ln=True)
    pdf.cell(0, 5, f"Board Approval Date: {board_approval_date.strftime('%B %d, %Y')}", ln=True)
    pdf.ln(4)

    # Parties
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "1. PARTIES", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(0, 5,
        f"This Virtual Share Allotment Letter (the \"Agreement\") is entered into by and between "
        f"{company} (the \"Company\") and {beneficiary}, residing at {address} (the \"Beneficiary\"), "
        f"collectively referred to as the \"Parties\"."
    )
    pdf.ln(3)

    # Grant
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "2. GRANT OF VIRTUAL SHARES", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(0, 5,
        f"Subject to the terms and conditions of this Agreement and the Company's Virtual Share Option Program, "
        f"the Company hereby grants to the Beneficiary a total of {num_shares:,} (in words: "
        f"{_num_to_words(num_shares)}) Virtual Shares (the \"Virtual Shares\")."
    )
    pdf.ln(1)
    pdf.multi_cell(0, 5,
        f"Allotment Date: {allotment_date.strftime('%B %d, %Y')}\n"
        f"Strike Price per Virtual Share: EUR {strike_price:.2f}\n"
        f"Total Number of Virtual Shares: {num_shares:,}"
    )
    pdf.ln(3)

    # Vesting
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "3. VESTING SCHEDULE", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(0, 5,
        f"The Virtual Shares shall vest over a period of {vesting_schedule}. "
        f"The cliff period shall commence on the Allotment Date and end {cliff_months} months thereafter "
        f"(the \"Cliff Date\"). No Virtual Shares shall vest prior to the Cliff Date. Following the Cliff Date, "
        f"{vesting_detail}, such that all Virtual Shares shall be fully vested "
        f"{total_years} years after the Allotment Date."
    )
    pdf.ln(3)

    # Accelerated vesting
    if has_accelerated_vesting:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, "4. ACCELERATED VESTING", ln=True)
        pdf.set_font("Helvetica", size=10)
        trigger = random.choice([
            "a Change of Control event (as defined below)",
            "an Initial Public Offering (IPO) of the Company",
            "a Change of Control event or an Initial Public Offering",
        ])
        accel_pct = random.choice([50, 75, 100])
        pdf.multi_cell(0, 5,
            f"Notwithstanding Section 3, in the event of {trigger}, "
            f"{accel_pct}% of the then-unvested Virtual Shares shall immediately vest on the date of such event "
            f"(\"Accelerated Vesting\"). For the purposes of this Agreement, a \"Change of Control\" shall mean "
            f"(i) the sale of all or substantially all assets of the Company, (ii) a merger or consolidation in which "
            f"the Company is not the surviving entity, or (iii) the acquisition by any person or group of more than "
            f"50% of the voting shares of the Company."
        )
        pdf.ln(3)
        next_section = 5
    else:
        next_section = 4

    # Exercise
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"{next_section}. EXERCISE AND SETTLEMENT", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(0, 5,
        f"Vested Virtual Shares may be exercised by the Beneficiary upon the occurrence of a Liquidity Event "
        f"or, at the Company's discretion, during designated exercise windows. The settlement amount per "
        f"Virtual Share shall equal the Fair Market Value per share at the time of exercise, less the Strike Price "
        f"of EUR {strike_price:.2f}. Settlement shall be made in cash within {exercise_window_days} days of exercise. "
        f"The Company reserves the right to settle in shares of the Company at its sole discretion."
    )
    pdf.ln(3)
    next_section += 1

    # Leaver provisions
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"{next_section}. GOOD LEAVER / BAD LEAVER", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(0, 5, leaver_provision)
    pdf.ln(3)
    next_section += 1

    # Non-compete (optional)
    if non_compete:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, f"{next_section}. NON-COMPETE", ln=True)
        pdf.set_font("Helvetica", size=10)
        pdf.multi_cell(0, 5, non_compete)
        pdf.ln(3)
        next_section += 1

    # Confidentiality
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"{next_section}. CONFIDENTIALITY", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(0, 5, confidentiality)
    pdf.ln(3)
    next_section += 1

    # Governing law
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"{next_section}. GOVERNING LAW AND JURISDICTION", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(0, 5,
        f"This Agreement shall be governed by and construed in accordance with {governing_law}. "
        f"Any disputes arising out of or in connection with this Agreement shall be submitted to the "
        f"exclusive jurisdiction of the competent courts at the registered seat of the Company."
    )
    pdf.ln(3)
    next_section += 1

    # Miscellaneous
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, f"{next_section}. MISCELLANEOUS", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.multi_cell(0, 5,
        "This Agreement constitutes the entire understanding between the Parties with respect to the subject matter "
        "hereof and supersedes all prior negotiations, representations, and agreements. Any amendments to this "
        "Agreement must be made in writing and signed by both Parties. If any provision of this Agreement is held "
        "to be invalid or unenforceable, the remaining provisions shall continue in full force and effect."
    )
    pdf.ln(6)

    # Signature block
    pdf.set_font("Helvetica", size=10)
    pdf.cell(0, 5, f"Place, Date: __________________, {allotment_date.strftime('%B %d, %Y')}", ln=True)
    pdf.ln(10)

    pdf.cell(90, 5, "____________________________", ln=False)
    pdf.cell(90, 5, "____________________________", ln=True)
    pdf.cell(90, 5, f"For {company.split(' ')[0]} {company.split(' ')[1]}", ln=False)
    pdf.cell(90, 5, beneficiary, ln=True)
    pdf.cell(90, 5, "Managing Director", ln=False)
    pdf.cell(90, 5, "Beneficiary", ln=True)

    # Save
    filename = f"allotment_{index+1:03d}_{beneficiary.replace(' ', '_')}.pdf"
    filepath = os.path.join(OUTPUT_DIR, filename)
    pdf.output(filepath)
    return filepath, beneficiary, num_shares, strike_price, allotment_date, has_accelerated_vesting


def _num_to_words(n: int) -> str:
    """Simple number to words for common share counts."""
    words = {
        500: "five hundred", 1000: "one thousand", 1500: "one thousand five hundred",
        2000: "two thousand", 2500: "two thousand five hundred", 3000: "three thousand",
        5000: "five thousand", 7500: "seven thousand five hundred",
        10000: "ten thousand", 15000: "fifteen thousand", 20000: "twenty thousand",
    }
    return words.get(n, str(n))


if __name__ == "__main__":
    print(f"Generating 50 allotment letters in {OUTPUT_DIR}...\n")
    summary = []
    for i in range(50):
        path, name, shares, price, adate, accel = generate_letter(i)
        summary.append((name, shares, price, adate, accel))
        print(f"  [{i+1:02d}/50] {os.path.basename(path)}")

    print(f"\nDone! {len(summary)} PDFs created in {OUTPUT_DIR}/")
    print(f"\nSample breakdown:")
    accel_count = sum(1 for s in summary if s[4])
    print(f"  - With accelerated vesting: {accel_count}")
    print(f"  - Without accelerated vesting: {len(summary) - accel_count}")
    print(f"  - Share range: {min(s[1] for s in summary):,} - {max(s[1] for s in summary):,}")
    print(f"  - Strike price range: EUR {min(s[2] for s in summary):.2f} - EUR {max(s[2] for s in summary):.2f}")
