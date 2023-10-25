# legislators-api

# Members of parliament

Lookup from postal code to MP and constituency is provided online at
https://www.ourcommons.ca/Members/en/search/csv?searchText=v5w%203h8&parliament=all.

- We can cache this lookup over time so we don't hit that site very often.

Once we have this information we can lookup their Hill and Constituency Office
addresses in [this file](data/addresses-members-of-parliament.html)

- though it needs to converted from HTML to JSON.

Bills under consideration and finished (passed, abandonned etc) are at
https://www.parl.ca/legisinfo/en/legislation-at-a-glance which can be exported
as JSON at https://www.parl.ca/legisinfo/en/legislation-at-a-glance/json

- This if for the latest session
- Earlier sessions are available also with a parameter
  https://www.parl.ca/legisinfo/en/legislation-at-a-glance?parlsession=43-2
- So we need to cut this down to less data and then coalesce all the relevant
  sessions in parliament

An example bill S-8 "An Act to amend the Immigration and Refugee Protection Act,
to make consequential amendments to other Acts and to amend the Immigration and
Refugee Protection Regulations"

- has its own page https://www.parl.ca/legisinfo/en/bill/44-1/s-8?view=details
  with Progress Details and About tabs
- is listed in above page and final vote was at JSONpath:
  [142].HouseVoteDetails[3].DivisionNumber with "DecisionResultNameEn": "Agreed
  To"

Its final vote with all members votes is available at
https://www.ourcommons.ca/Members/en/votes/44/1/387. Note each vote has its own
id - this was 387
