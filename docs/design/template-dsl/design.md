template standard

    declare
        font "Baskerville"
        font-size 18

    game-title
    < room-name > score | turn

    main-column scrolling 75% :: info-column fixed 25%

    main-column
        main-text
        right-embedded-image floating right wrap 30%
        left-embedded-image floating left nowrap 20%

    info-column
        compass top

    command-line

end template

----------------------- INFO ----------------------

< means left adjust
> meand right adjust
:: column separator

slots
    game-title
    room-name
    score
    turn
    main-text
    compass
