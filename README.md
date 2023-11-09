# legislators-api

# Members of parliament

## Lookup by Constituency

Lookup from postal code to MP and constituency is provided online at
https://www.ourcommons.ca/Members/en/search/csv?searchText=v5w%203h8&parliament=all.

- We can cache this lookup over time so we don't hit that site very often.

## Riding to Members

There is XML data source captured from
https://www.ourcommons.ca/en/open-data#CurrentMembers into
parliament-members.xml in the following format.

<MemberOfParliament>
<PersonShortHonorific />
<PersonOfficialFirstName>Ziad</PersonOfficialFirstName>
<PersonOfficialLastName>Aboultaif</PersonOfficialLastName>
<ConstituencyName>Edmonton Manning</ConstituencyName>
<ConstituencyProvinceTerritoryName>Alberta</ConstituencyProvinceTerritoryName>
<CaucusShortName>Conservative</CaucusShortName>
<FromDateTime>2021-09-20T00:00:00</FromDateTime>
<ToDateTime xsi:nil="true" />
</MemberOfParliament>

## Member Names to Addresses

Once we have a member's name we can lookup their Hill and Constituency Office
addresses in [this file](data/addresses-members-of-parliament.html) extracted
from
[Addresses for Current Members of Parliament](https://www.ourcommons.ca/Members/en/addresses)
and cached temporarily as JSON

## Other data per member

### Email addresses

Email addresses are not included address information above but can be pulled
from individual pages like:

https://www.ourcommons.ca/Members/en/constituencies/brome-missisquoi(652)

There's a single div on that page that contains:

- Email pascale.st-onge@parl.gc.ca
- Preferred Language French

### Area, Population and Votes

From that page there's also
[Electoral District Profile](http://www.elections.ca/scripts/vis/Profile?L=e&ED=24016&EV=99&EV_TYPE=6&PC=&Prov=&MapID=&QID=-1)
that includes the following:

- Area: 3,035 km2
- Population**: 113,913
- Number of electors on list****: 94,728

## Bills and Votes

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
