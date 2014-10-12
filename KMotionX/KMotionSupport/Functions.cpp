/*
 * incX.cpp
 *
 *  Created on: 19 sep 2014
 *      Author: parhansson
 */


#include "MessageBox.h"
#include <assert.h>
#include <time.h>
#include <sys/time.h>
#include <ctype.h>
#include <iostream>

#define SECONDS_PER_MONTH 2629743

//currently not used
char *fix_slashes(char *path)
{
    char *p;
    for (p = path; *p; ++p)
        if (*p == '\\')
            *p = '/';
    return path;
}


long GetTickCount()
{
    struct timeval tv;
    if(gettimeofday(&tv, NULL) != 0)
        return 0;

    return (tv.tv_sec * 1000) + (tv.tv_usec / 1000);
}

char* _strupr(char* s)
{
  if(s == (void*)0) return s;
  char* p = s;
  while ((*p = toupper( *p ))) p++;
  return s;
}

char* _strlwr(char* s)
{
  if(s == (void*)0) return s;
  char* p = s;
  while ((*p = tolower( *p ))) p++;
  return s;
}


unsigned int timeGetTime()
{

	//this is an ugly beast. cut from windows API doc

	//The timeGetTime function retrieves the system time, in milliseconds.
	//The system time is the time elapsed since Windows was started.


	//Note that the value returned by the timeGetTime function is a DWORD value.
	//The return value wraps around to 0 every 2^32 milliseconds, which is about 49.71 days.
	//This can cause problems in code that directly uses the timeGetTime return value in computations,
	//particularly where the value is used to control code execution.
	//You should always use the difference between two timeGetTime return values in computations.

	//We normalize to current month which is about 30 days and will fit in unsigned int.
	struct timeval now;
	gettimeofday(&now, NULL);
	unsigned long epoch = (now.tv_sec);
	unsigned int monthSinceEpoch = epoch/SECONDS_PER_MONTH;
	unsigned int sThisMonth = epoch - (SECONDS_PER_MONTH * monthSinceEpoch);
	unsigned int msThisMonth = sThisMonth*1000 + now.tv_usec/1000;
	//printf("Timestamp: monthSinceEpoch=%d sThisMonth=%d msThisMonth=%d\n", monthSinceEpoch,sThisMonth, msThisMonth);

	return msThisMonth;
}


int AfxMessageBox(const char* value, int type){
	char str[100];
	std::cout << "---------AfxMessageBox: " << " OPTION: " << type << "---------\n"
			<< value
			<< "\n-----------------------------------------------\n"<< std::endl;
	if((type & MB_OK) == MB_OK){
		printf(">OK?");
		fgets(str, 100, stdin);
	}else if((type & MB_YESNO) == MB_YESNO){
		printf(">(Yes/No)?");
		fgets(str, 100, stdin);
	}else if((type & MB_OKCANCEL) == MB_OKCANCEL){
		printf(">(Ok/Cancel)?");
		fgets(str, 100, stdin);
	}


	// testing for multiple flags
	// as above, OR the bitmasks
	//if ((flags & (LOG_INCOMING | LOG_OUTGOING))
	//         == (LOG_INCOMING | LOG_OUTGOING))
	return 0;
}

int MessageBox(int whatisthis,const char* value,const char* title, int type){
	std::cout  << "------------MessageBox: " << " OPTION: " << type << "---------\n"
				<< value
				<< "\n-----------------------------------------------\n"<< std::endl;

	return 0;
}
