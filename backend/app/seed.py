from datetime import date, time
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.accommodation import Accommodation
from app.models.activity import Activity
from app.models.destination import Destination
from app.models.expense import Expense
from app.models.document import TravelDocument
from app.models.member import TripMember
from app.models.message import ChatMessage
from app.models.note import Note
from app.models.packing import PackingItem
from app.models.presence import EmergencyContact
from app.models.trip import Trip
from app.models.user import User

DEMO_PASSWORD = "TripWise@123"


def seed_if_empty(db: Session) -> None:
    if db.query(User).first():
        return

    admin = User(
        full_name="TripWise Admin",
        email="admin@tripwise.dev",
        password_hash=hash_password(DEMO_PASSWORD),
        role="admin",
        status="active",
    )
    traveler = User(
        full_name="Aria Sen",
        email="traveler@tripwise.dev",
        password_hash=hash_password(DEMO_PASSWORD),
        role="traveler",
        status="active",
        bio="Collects train windows and temple hours.",
        home_city="Mumbai",
        travel_style="culture",
    )
    kenji = User(
        full_name="Kenji Mori",
        email="kenji@tripwise.dev",
        password_hash=hash_password(DEMO_PASSWORD),
        role="traveler",
        status="active",
        bio="Osaka nights, Kyoto mornings.",
        home_city="Osaka",
        travel_style="culture",
    )
    meera = User(
        full_name="Meera Iyer",
        email="meera@tripwise.dev",
        password_hash=hash_password(DEMO_PASSWORD),
        role="traveler",
        status="active",
        bio="Always packing one extra pair of shoes.",
        home_city="Bengaluru",
        travel_style="adventure",
    )
    lucas = User(
        full_name="Lucas Costa",
        email="lucas@tripwise.dev",
        password_hash=hash_password(DEMO_PASSWORD),
        role="traveler",
        status="active",
        bio="Looking for a van and a playlist.",
        home_city="Lisbon",
        travel_style="leisure",
    )
    db.add_all([admin, traveler, kenji, meera, lucas])
    db.flush()

    kyoto = Trip(
        user_id=traveler.id,
        title="Kyoto Autumn",
        start_date=date(2026, 10, 10),
        end_date=date(2026, 10, 16),
        estimated_budget=Decimal("180000"),
        trip_type="culture",
        currency="INR",
        visibility="public",
        join_mode="open",
        is_public=True,
        seats=2,
    )
    goa = Trip(
        user_id=traveler.id,
        title="Goa Weekend",
        start_date=date(2026, 5, 2),
        end_date=date(2026, 5, 5),
        estimated_budget=Decimal("45000"),
        trip_type="leisure",
        currency="INR",
    )
    lisbon = Trip(
        user_id=traveler.id,
        title="Lisbon Light",
        start_date=date(2026, 12, 12),
        end_date=date(2026, 12, 18),
        estimated_budget=Decimal("140000"),
        trip_type="adventure",
        currency="INR",
        visibility="public",
        join_mode="request",
        is_public=True,
        looking_for_ride=True,
        seats=3,
    )
    osaka = Trip(
        user_id=kenji.id,
        title="Osaka Food Crawl",
        start_date=date(2026, 10, 8),
        end_date=date(2026, 10, 12),
        estimated_budget=Decimal("90000"),
        trip_type="leisure",
        currency="INR",
        visibility="public",
        join_mode="open",
        is_public=True,
        seats=3,
        looking_for_ride=True,
    )
    db.add_all([kyoto, goa, lisbon, osaka])
    db.flush()

    tokyo = Destination(
        trip_id=kyoto.id, sequence_no=1, city="Tokyo", country="Japan",
        arrival_date=date(2026, 10, 10), departure_date=date(2026, 10, 12),
        lat=35.6762, lng=139.6503, notes="Suica on arrival. Pocket wifi counter B12.",
    )
    kyo = Destination(
        trip_id=kyoto.id, sequence_no=2, city="Kyoto", country="Japan",
        arrival_date=date(2026, 10, 12), departure_date=date(2026, 10, 16),
        lat=35.0116, lng=135.7681, notes="Gion is quietest before 8am.",
    )
    panaji = Destination(
        trip_id=goa.id, sequence_no=1, city="Panaji", country="India",
        arrival_date=date(2026, 5, 2), departure_date=date(2026, 5, 5),
        lat=15.4909, lng=73.8278, notes="Ferries thin out after 6pm.",
    )
    lis = Destination(
        trip_id=lisbon.id, sequence_no=1, city="Lisbon", country="Portugal",
        arrival_date=date(2026, 12, 12), departure_date=date(2026, 12, 16),
        lat=38.7223, lng=-9.1393, notes="Tram 28 is a postcard, not a commute.",
    )
    porto = Destination(
        trip_id=lisbon.id, sequence_no=2, city="Porto", country="Portugal",
        arrival_date=date(2026, 12, 16), departure_date=date(2026, 12, 18),
        lat=41.1579, lng=-8.6291, notes="Walk the Ribeira at blue hour.",
    )
    osaka_stop = Destination(
        trip_id=osaka.id, sequence_no=1, city="Osaka", country="Japan",
        arrival_date=date(2026, 10, 8), departure_date=date(2026, 10, 12),
        lat=34.6937, lng=135.5023, notes="Dotonbori after dark. Cash for kushikatsu.",
    )
    db.add_all([tokyo, kyo, panaji, lis, porto, osaka_stop])
    db.flush()

    db.add_all(
        [
            Activity(
                destination_id=tokyo.id,
                title="Senso-ji at dawn",
                description="Walk the Nakamise before the crowds.",
                activity_date=date(2026, 10, 10),
                start_time=time(6, 30),
                end_time=time(8, 30),
                location="Asakusa",
                category="Culture",
            ),
            Activity(
                destination_id=tokyo.id,
                title="teamLab Planets",
                description="Barefoot rooms — pack a small towel.",
                activity_date=date(2026, 10, 11),
                start_time=time(14, 0),
                end_time=time(16, 30),
                location="Toyosu",
                category="Sightseeing",
            ),
            Activity(
                destination_id=kyo.id,
                title="Fushimi Inari",
                description="Start from the back trails if the gates are packed.",
                activity_date=date(2026, 10, 13),
                start_time=time(7, 0),
                end_time=time(10, 0),
                location="Fushimi",
                category="Culture",
            ),
            Activity(
                destination_id=kyo.id,
                title="Arashiyama bamboo & river",
                description="Boat if the weather holds.",
                activity_date=date(2026, 10, 14),
                start_time=time(9, 0),
                end_time=time(13, 0),
                location="Arashiyama",
                category="Nature",
            ),
            Activity(
                destination_id=panaji.id,
                title="Fontainhas walk",
                description="Latin Quarter colours and bakeries.",
                activity_date=date(2026, 5, 3),
                start_time=time(17, 0),
                end_time=time(19, 0),
                location="Fontainhas",
                category="Sightseeing",
            ),
            Activity(
                destination_id=lis.id,
                title="Tram 28 to Graça lookout",
                description="Get off before the tram becomes a queue.",
                activity_date=date(2026, 12, 13),
                start_time=time(9, 0),
                end_time=time(12, 0),
                location="Alfama",
                category="Transit",
            ),
            Activity(
                destination_id=lis.id,
                title="Time Out Market lunch",
                description="One stall each, no heroics.",
                activity_date=date(2026, 12, 13),
                start_time=time(13, 0),
                end_time=time(15, 0),
                location="Cais do Sodré",
                category="Food",
            ),
            Activity(
                destination_id=osaka_stop.id,
                title="Dotonbori night crawl",
                description="Takoyaki first. Then the Glico sign.",
                activity_date=date(2026, 10, 8),
                start_time=time(19, 0),
                end_time=time(22, 0),
                location="Dotonbori",
                category="Food",
            ),
            Activity(
                destination_id=porto.id,
                title="Ribeira & Gaia crossing",
                description="Walk the lower deck of Dom Luís I.",
                activity_date=date(2026, 12, 16),
                start_time=time(16, 0),
                end_time=time(18, 30),
                location="Ribeira",
                category="Sightseeing",
            ),
        ]
    )

    db.add_all(
        [
            Expense(
                destination_id=tokyo.id,
                amount=Decimal("12500"),
                category="Transport",
                expense_date=date(2026, 10, 10),
                description="Narita Express",
            ),
            Expense(
                destination_id=tokyo.id,
                amount=Decimal("3200"),
                category="Food",
                expense_date=date(2026, 10, 10),
                description="Ichiran ramen",
            ),
            Expense(
                destination_id=kyo.id,
                amount=Decimal("28000"),
                category="Stay",
                expense_date=date(2026, 10, 12),
                description="Ryokan deposit",
            ),
            Expense(
                destination_id=kyo.id,
                amount=Decimal("4500"),
                category="Activities",
                expense_date=date(2026, 10, 13),
                description="Temple passes",
            ),
            Expense(
                destination_id=panaji.id,
                amount=Decimal("8200"),
                category="Stay",
                expense_date=date(2026, 5, 2),
                description="Fontainhas guesthouse",
            ),
            Expense(
                destination_id=panaji.id,
                amount=Decimal("2100"),
                category="Food",
                expense_date=date(2026, 5, 3),
                description="Bebinca & dinner",
            ),
            Expense(
                destination_id=lis.id,
                amount=Decimal("9800"),
                category="Stay",
                expense_date=date(2026, 12, 12),
                description="Alfama apartment deposit",
            ),
            Expense(
                destination_id=lis.id,
                amount=Decimal("2400"),
                category="Food",
                expense_date=date(2026, 12, 13),
                description="Time Out Market",
            ),
        ]
    )

    db.add_all(
        [
            Accommodation(
                destination_id=tokyo.id,
                property_name="Onsen Yuraku",
                address="2-chome, Asakusa, Taito City",
                check_in=date(2026, 10, 10),
                check_out=date(2026, 10, 12),
                booking_reference="TYO-88421",
                contact="+81 3 5555 0199",
                price_per_night=Decimal("14000"),
                notes="Late check-in code emailed.",
            ),
            Accommodation(
                destination_id=kyo.id,
                property_name="Gion House Machiya",
                address="Shijo-dori, Gion",
                check_in=date(2026, 10, 12),
                check_out=date(2026, 10, 16),
                booking_reference="KYO-33108",
                contact="+81 75 555 0142",
                price_per_night=Decimal("18500"),
                notes="Shoes off at the genkan. Yukata in the closet.",
            ),
            Accommodation(
                destination_id=panaji.id,
                property_name="Casa Fontainhas",
                address="31st January Road",
                check_in=date(2026, 5, 2),
                check_out=date(2026, 5, 5),
                booking_reference="GOA-2291",
                contact="+91 832 555 0147",
                price_per_night=Decimal("4200"),
            ),
            Accommodation(
                destination_id=lis.id,
                property_name="Casa da Sé",
                address="Largo da Sé, Alfama",
                check_in=date(2026, 12, 12),
                check_out=date(2026, 12, 16),
                booking_reference="LIS-4410",
                contact="+351 21 555 0190",
                price_per_night=Decimal("9200"),
                notes="Third floor, no lift. Tram stop 40m.",
            ),
        ]
    )

    db.add_all(
        [
            Note(
                trip_id=kyoto.id,
                title="SUICA + pocket wifi",
                content="Reload SUICA at the airport. Pocket wifi pickup is counter B12.",
            ),
            Note(
                trip_id=kyoto.id,
                title="Cash vs card",
                content="Temples and tiny ramen shops are still cash-first. Keep ¥10,000 on you.",
            ),
            Note(
                trip_id=goa.id,
                title="Ferry timings",
                content="Panaji to Old Goa ferries thin out after 6pm.",
            ),
        ]
    )

    packing = [
        ("Passport", "Documents"),
        ("JR Pass copy", "Documents"),
        ("Universal adapter", "Electronics"),
        ("Comfortable walking shoes", "Clothes"),
        ("Light rain jacket", "Clothes"),
        ("Sunscreen", "Health"),
        ("Toiletry kit", "Toiletries"),
    ]
    for name, cat in packing:
        db.add(PackingItem(trip_id=kyoto.id, item_name=name, category=cat, is_packed=name in ("Passport", "Universal adapter")))

    db.add_all(
        [
            TripMember(trip_id=kyoto.id, user_id=traveler.id, role="owner", status="active"),
            TripMember(trip_id=kyoto.id, user_id=kenji.id, role="member", status="active"),
            TripMember(trip_id=kyoto.id, user_id=meera.id, role="member", status="active"),
            TripMember(trip_id=goa.id, user_id=traveler.id, role="owner", status="active"),
            TripMember(trip_id=lisbon.id, user_id=traveler.id, role="owner", status="active"),
            TripMember(trip_id=lisbon.id, user_id=lucas.id, role="member", status="pending"),
            TripMember(trip_id=osaka.id, user_id=kenji.id, role="owner", status="active"),
            TripMember(trip_id=osaka.id, user_id=meera.id, role="member", status="active"),
        ]
    )
    db.add_all(
        [
            ChatMessage(trip_id=kyoto.id, user_id=kenji.id, body="Dawn at Fushimi — I'll bring the headlamps."),
            ChatMessage(trip_id=kyoto.id, user_id=meera.id, body="I have the JR pass PDFs in Papers. Don't forget cash for the temples."),
            ChatMessage(trip_id=kyoto.id, user_id=traveler.id, body="Room at Gion House is under my name. Shoes off at the genkan."),
        ]
    )
    db.add(
        EmergencyContact(user_id=traveler.id, name="Rohan Sen", phone="+91 98765 11122", email="rohan@example.com")
    )
    db.add_all(
        [
            TravelDocument(
                trip_id=kyoto.id, title="Indian passport", kind="Passport",
                reference="N1234567", expiry_date=date(2031, 4, 12), notes="Keep a colour scan in Drive.",
            ),
            TravelDocument(
                trip_id=kyoto.id, title="Japan e-visa PDF", kind="Visa",
                reference="JP-2026-8891", expiry_date=date(2026, 12, 31), notes="Printed + phone copy.",
            ),
            TravelDocument(
                trip_id=kyoto.id, title="NRT-KIX flights", kind="Ticket",
                reference="NH 625", notes="Window seat requested.",
            ),
            TravelDocument(
                trip_id=lisbon.id, title="Schengen travel insurance", kind="Insurance",
                reference="HDFC-TRV-44012", expiry_date=date(2027, 1, 15),
            ),
        ]
    )
    db.commit()
