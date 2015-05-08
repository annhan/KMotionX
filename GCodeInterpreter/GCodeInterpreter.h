// GCodeInterpreter.h  --  KMotion G Code Interpreter DLL Interface class
/*********************************************************************/
/*         Copyright (c) 2003-2006  DynoMotion Incorporated          */
/*********************************************************************/



#include "CoordMotion.h"
#include "rs274ngc.h"
#include "SetupTracker.h"
/*

int Interpret(int board,
              char *fname,
              int start, int end,
              int restart,
              G_COMPLETE_CALLBACK CompleteFn,
              G_STATUS_CALLBACK StatusFn);



Internally this function creates a thread and begins interpreting the
specified file of GCode beginning at the specified file start line number
(0=beginning of file) and proceeds upto and including the specified end line
number (-1=entire file).  If the restart flag is specified, the Interpreter
will be re-initialized, otherwise it will resume in its present state.  The
function returns immediately after creating the thread that will be used to
interpret the GCode.  As the GCode is interpreted any generated commands
will be sent to the specified KMotion board after possibly being passed
through the Trajectory Planner.  Status Strings which describe the types of
commands generated by the interpreter may be passed back to the caller via
the StatusFn callback.  When completed (or on an error) the CompleteFn
Callback may be made with a status code indicating success or error.  If
there is an error, the offending line number and an error string will also
be passed.  If either callback is specified as NULL, then the respective
callback(s) will not be made.

Return Value:

0 = success, 1 = failure


Parameters:

int board

	specifies KMotion board to send commands to

char *fname

	GCode FileName

int start

	Starting line number 0 = beginning of file

int end,

	End line number -1 = beginning of file
	same as start will execute one line

                     int restart,
                     COMPLETE_CALLBACK CompleteFn,
                     STATUS_CALLBACK StatusFn);


*/

#if !defined(GCODEINTERPRETER_H)
#define GCODEINTERPRETER_H

#pragma warning(disable: 4275)
#pragma warning(disable: 4251)

#define THETA_SIGMA 1e-13

typedef void G_COMPLETE_CALLBACK(int status, int lineno, int sequence_number, const char *err);
typedef void G_STATUS_CALLBACK(int line_no, const char *msg);
typedef int G_USER_CALLBACK(const char *msg);
typedef int G_M_USER_CALLBACK(int mCode);



// Misc Commands (M Code) within GCode are normally used
// for spindle on/off and such.  In general any M Code
// may be mapped to various KMotion "Actions" such as
//

enum { 
	M_Action_None = 0,				// do nothing 
	M_Action_Setbit = 1,			// Set a bit high or low
	M_Action_SetTwoBits = 2,		// Set two bits either high or low
	M_Action_DAC = 3,				// output a value to a DAC
	M_Action_Program = 4,			// run a KMotion User C program   
	M_Action_Program_wait = 5,		// run a KMotion User C program wait til finished
	M_Action_Program_wait_sync = 6,	// run a KMotion User C program wait til finished, resync positions
	M_Action_Program_PC = 7,		// run a Windows program wait til finished
	M_Action_Callback = 8,		    // Callback to the User Application
	M_Action_Waitbit = 9,			// Wait/Hold until a bit is high or low
};

#define MAX_MCODE_ACTIONS_M1 11        // actually only 2-10 are used
#define MAX_MCODE_ACTIONS_BUTTONS 10
#define MAX_MCODE_ACTIONS_M100 20
#define MAX_MCODE_ACTIONS (MAX_MCODE_ACTIONS_M1+MAX_MCODE_ACTIONS_M100+MAX_MCODE_ACTIONS_BUTTONS)
#define MAX_MCODE_DOUBLE_PARAMS 5
#define MCODE_ACTIONS_M100_OFFSET (MAX_MCODE_ACTIONS_M1+MAX_MCODE_ACTIONS_BUTTONS)

// This structure defines the action and 
// parameters for a particular MCode Action

typedef struct
{
	int Action;
	double dParams[MAX_MCODE_DOUBLE_PARAMS];
	char String[256];
} MCODE_ACTION; 



// This class is exported from the GCodeInterpreter.dll

class GCODEINTERPRETER_API CGCodeInterpreter {
public:
	int ChangeFixtureNumber(int fixture);
	
	int SetOrigin(int index, double x, double y, double z, double a, double b, double c);
	int GetOrigin(int index, double *x, double *y, double *z, double *a, double *b, double *c);
 
	double InchesToUserUnits(double inches);
	double InchesOrDegToUserUnitsA(double inches);
	double InchesOrDegToUserUnitsB(double inches);
	double InchesOrDegToUserUnitsC(double inches);
	double UserUnitsToInches(double inches);
	double UserUnitsToInchesOrDegA(double inches);
	double UserUnitsToInchesOrDegB(double inches);
	double UserUnitsToInchesOrDegC(double inches);
	double ConvertAbsToUserUnitsX(double x);
	double ConvertAbsToUserUnitsY(double y);
	double ConvertAbsToUserUnitsZ(double z);
	double ConvertAbsToUserUnitsA(double a);
	double ConvertAbsToUserUnitsB(double b);
	double ConvertAbsToUserUnitsC(double c);
	void ConvertAbsoluteToInterpreterCoord(double x,double y,double z,double a,double b,double c, 
										double *gx,double *gy,double *gz,double *ga,double *gb,double *gc);
	void ConvertAbsoluteToMachine(double x,double y,double z,double a,double b,double c, 
									double *gx,double *gy,double *gz,double *ga,double *gb,double *gc);
	
	int ReadAndSyncCurPositions(double *x, double *y, double *z, double *a, double *b, double *c);

	void SetFeedRate(double);

	int InvokeAction(int i, BOOL FlushBeforeUnbufferedOperation=TRUE);

	int rs274ngc_save_parameters();	// save interpreter vars

	int DoReverseSearch(const char * InFile, int CurrentLine); // search backward to try to set Interpreter State


	CGCodeInterpreter(CCoordMotion *CM);
	virtual ~CGCodeInterpreter(void);

	int Interpret(
				  int board_type,
		          const char *fname,
			      int start, int end,
				  int restart,
                  G_STATUS_CALLBACK *StatusFn,
				  G_COMPLETE_CALLBACK *CompleteFn);


	MCODE_ACTION McodeActions[MAX_MCODE_ACTIONS];
	int ExecutePC(const char *Name);
	
	MOTION_PARAMS *GetMotionParams();  // returns a pointer to the GCode Parameters

	char ToolFile[MAX_PATH];
	char SetupFile[MAX_PATH];
	char GeoFile[MAX_PATH];
	char VarsFile[MAX_PATH];

	CCoordMotion *CoordMotion;
	bool m_Halt;
	int m_CurrentLine;
	int m_GCodeReads;
	char m_InFile[MAX_PATH];
	int m_exitcode;
	
	// SJH - added these virtuals as a hook for derived classes to implement any special measures
	// required when the interpreter thread is started and finished.
	virtual void ThreadStarted() {}     // First function called when interpreter thread started (from Interpret())
	virtual void ThreadFinished() {}    // Final function called before terminating thread.
	
	int DoExecute();
	int DoExecuteComplete();

	void SetToolFile(char *f);
	void SetSetupFile(char *f);
	void SetVarsFile(char *f);

	int SetCSS(int mode);  // set CSS mode

	int ReadSetupFile();

	void Halt();
	bool GetHalt();
	void Abort();
	bool GetAbort();

	setup_pointer p_setup;
	bool m_InitializeOnExecute;
	bool m_ReadToolFile;
	int m_start, m_end;

	bool m_Resume;
	double m_ResumeSafeZ;
	int m_ResumeSafeRelAbs;
	BOOL m_ResumeMoveToSafeZ;
	BOOL m_ResumeTraverseXY;
	double m_ResumeTraverseSafeX;
	double m_ResumeTraverseSafeY;
	BOOL m_ResumeSafeStartSpindle;
	int m_ResumeSafeSpindleCWCCW;
	BOOL m_ResumeDoSafeFeedZ;
	double m_ResumeFeedSafeZ;
	double m_ResumeResumeFeedRate;
	double m_ResumeZFeedRate;
	BOOL m_ResumeRestoreFeedRate;

private:

	char *m_fname;
	int m_restart;
	G_COMPLETE_CALLBACK *m_CompleteFn;
    G_STATUS_CALLBACK *m_StatusFn;

	int DoResumeSafe();

	int rs274ErrorExit(int status);
	int LaunchExecution();
	// tracks changes to the interpreter so we can roll back on halts
	CSetupTracker SetupTracker;
public:
    G_USER_CALLBACK *m_UserFn;
    G_M_USER_CALLBACK *m_UserFnMCode;
	setup m_StoppedInterpState;
	int InitializeInterp(void);
	void SetUserCallback(G_USER_CALLBACK *UserFn);
	void SetUserMCodeCallback(G_M_USER_CALLBACK *UserFn);
};

extern CCoordMotion *CM;
extern CGCodeInterpreter *GC;


#endif

