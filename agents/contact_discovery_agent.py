"""Contact Discovery Agent — finds reachable contact details for a lead."""

from __future__ import annotations

from agents.base_agent import BaseAgent


class ContactDiscoveryAgent(BaseAgent):
    name = "contact_discovery"
    role = "Find decision-maker contact details (email, phone) for a lead"
    model_key = "research"
    tool_names = ["find_contacts", "browse_page", "web_search"]

    @property
    def system_prompt(self) -> str:
        return (
            "You are Jarvis's Contact Discovery specialist.\n"
            "Given a business and its website, find the best contact email and phone.\n"
            "Use find_contacts on the website first; if nothing is found, check common "
            "pages (/contact, /about) with browse_page.\n"
            "Only report contact details you actually found — never invent an address.\n"
            "Report the primary email and phone, or state clearly that none were found."
        )
