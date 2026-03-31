!----------------------------------------------------------------------------
! BetaHTML.h   Version 1.2                                  A Betatesting Aid
! Stas Starkov      starkov_stas@mailru.com                        06/02/2001
! based on betatest.h by Marnie Parker  aka Doe    doeadeer3@aol.com
!----------------------------------------------------------------------------
! This library can output HTML file of your playing game, so it can be handy
! in beta testing. After beta comments in HTML file will be red line like this:
! **************** Beta-test comment above! ***************

! Include this library between the inclusion of the "Parser" and "VerbLib"
! library files. Like this: Include "betahtml.h";

! You can add routines BetaAfterPrompt() and BetaAfterComment() in your code to
! print out useful information, for example score, location, number of moves.

! Type 'beta' in the game and you'll get *.scr file.
! If you want to add beta comment type '! ' and after that type comment.
! After quiting from game rename output *.scr file to *.htm or *.html.


Replace ScriptOnSub;
Replace ScriptOffSub;
Replace QuitSub;

Global betamode = false;
Global Beta_HTML = false;

[ ScriptOnSub;
  if (~~(betamode))
  {  print "This will also automatically turn beta testing mode on. Continue? (Y or N) >";
     if (YesOrNo()==0) "^Beta testing mode remains off.";
     betamode = true;
     print "Do you want to have HTML output to script file? (Y or N) >";
     if (YesOrNo()==0)
        print "^Output to script file remains plain text.^^";
     else Beta_HTML = true;
  }
  transcript_mode = ((0-->8) & 1);
  if (transcript_mode) return L__M(##ScriptOn,1);
  @output_stream 2;
  if (((0-->8) & 1) == 0) return L__M(##ScriptOn,3);
  @output_stream -1;
  print "<HTML>
        ^<HEAD><TITLE>", (string) Story ,"</TITLE></HEAD>
        ^<BODY bgcolor=~white~ text=~blue~>^";
  if ( Beta_HTML )
    print "<PRE>^";
  else
    print "<XMP>^";
  @output_stream 1;
  L__M(##ScriptOn,2); VersionSub();
  transcript_mode = true;
  "^Beta testing mode is now on. Comments may be entered by preceding
    the line with a !. They will not be parsed by the game.";
];
    
[ ScriptOffSub;
  if (betamode)
  {  print "This will also automatically turn beta testing mode off. Continue? (Y or N) >";
     if (YesOrNo()==0) "^Beta testing mode remains on.";
     betamode = false;
  }
  transcript_mode = ((0-->8) & 1);
  if (transcript_mode == false) return L__M(##ScriptOff,1);
  L__M(##ScriptOff,2);
  if ( Beta_HTML )
  {
    @output_stream -1;
    print "</PRE>
          ^</BODY>
          ^</HTML>^";
    @output_stream 1;
  }
  else
  {
    @output_stream -1;
    print "^</XMP>
          ^</BODY>
          ^</HTML>^";
    @output_stream 1;
  }
  Beta_HTML = false;
  @output_stream -2;
  if ((0-->8) & 1) return L__M(##ScriptOff,3);
  transcript_mode = false;
  "^Beta testing mode is now off.";
];

[ QuitSub; L__M(##Quit,2);
  if (YesOrNo()~=0)
  { if (betamode) { betamode = false; <ScriptOff>; } quit; }
];

[ BetaTestOnSub;
  if (betamode) "Beta testing mode is already on.";
  betamode = true;
  print "Turning scripting on...^";
  print "Do you want to have HTML output to script file? (Y or N) > ";
  if (YesOrNo()==0)
     print "^Output to script file remains plain test.^";
  else Beta_HTML = true;
  <<ScriptOn>>;
];

[ BetaTestOffSub;
  if (~~(betamode)) "Beta testing mode is already off.";
  betamode = false;
  <<ScriptOff>>;
];

[ BetaCommentSub;
  if (betamode)
  {
    @output_stream -1;
    if ( Beta_HTML )
    {
        print "<FONT color=~red~><STRONG>
            ^**************** Beta-test comment above! ***************^";
        #IFDEF BetaAfterComment;
            BetaAfterComment();
        #ENDIF;
        print "</STRONG></FONT>^";
    }
    else
    {
        #IFDEF BetaAfterComment;
            BetaAfterComment();
        #ENDIF;
    }
    @output_stream 1;
    rtrue;
  }
  "Comments can only be used in beta testing mode.";
];

[ BeforeParsing;
  @output_stream -1;
  #IFDEF BetaAfterPrompt;
    BetaAfterPrompt();
  #ENDIF;
  if ( Beta_HTML )
    print "</STRONG></FONT>^";
  @output_stream 1;
  DrawStatusLine();
];

Object LibraryMessages
  with
  before [; Prompt:
                    if ( Beta_HTML )
                    {
                      @output_stream -1;
                      print "<FONT color=~green~><STRONG>^";
                      @output_stream 1;
                    }
                    print "^>";
                    rtrue;
           ];

Verb meta 'beta'
         *              ->BetaTestOn
         * 'test'       ->BetaTestOn
         * 'test' 'off' ->BetaTestOff
         * 'off'        ->BetaTestOff
         * 'test' 'on'  ->BetaTestOn
         * 'on'         ->BetaTestOn;

Verb meta '!'
         * topic        ->BetaComment;
