# legislators-api

# Members of parliament

A full list of members of parliament can be retrieved from the
[search page](https://www.ourcommons.ca/members/en/search) which contains a tile
for each member of parliament - including a link to an "contact" page for each
member. An example for
[Ziad Aboultaif](https://www.ourcommons.ca/members/en/ziad-aboultaif(89156)) is:

```<div class="ce-mip-mp-tile-container " id="mp-tile-person-id-89156">
<a class="ce-mip-mp-tile" href="/members/en/ziad-aboultaif(89156)">
    <div class="ce-mip-flex-tile">
        <div class="ce-mip-mp-picture-container">
            <img class="ce-mip-mp-picture visible-lg visible-md img-fluid" src="/Content/Parliamentarians/Images/OfficialMPPhotos/44/AboultaifZiad_CPC.jpg" loading="lazy"
                 alt="Photo - Ziad Aboultaif - Click to open the Member of Parliament profile">
        </div>
        <div class="ce-mip-tile-text">
            <div class="ce-mip-tile-top">
                <div class="ce-mip-mp-honourable"></div>
                <div class="ce-mip-mp-name">Ziad Aboultaif</div>
```

Notes:

- the 5 digit identifier at the end of the first line is needed and is available
  in the link on the original page.
- Its not safe to process the name with "\-" in it. Need to pull the name from
  the last line

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
and cached temporarily as JSON.

## Other data per member

### Email and website addresses

Email addresses are not included address information above but can be pulled
from individual pages like:

https://www.ourcommons.ca/Members/en/constituencies/brome-missisquoi(652)

There's a single div on that page that contains:

- Email pascale.st-onge@parl.gc.ca
- Preferred Language French

There's also a page about each member of parliament that contains a "Contact
Details" tab which contains

```<div class="container">
        <h4>Email</h4>
        <p><a href="mailto:ziad.aboultaif@parl.gc.ca">ziad.aboultaif@parl.gc.ca</a></p>

        <h4>Website</h4>
            <p><a href="http://ziadaboultaif.ca">http://ziadaboultaif.ca</a> </p>
```

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

```
```
