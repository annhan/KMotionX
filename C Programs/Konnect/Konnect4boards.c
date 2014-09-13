#include "KMotionDef.h"

main()
{
	double T0=Time_sec();
	double TT=0.005;
	InitAux();
	AddKonnect(0,&VirtualBits,VirtualBitsEx);
	AddKonnect(1,VirtualBitsEx+1,VirtualBitsEx+2);
	AddKonnect(2,VirtualBitsEx+3,VirtualBitsEx+4);
	AddKonnect(3,VirtualBitsEx+5,VirtualBitsEx+6);
	
	VirtualBits=VirtualBitsEx[1]=VirtualBitsEx[3]=VirtualBitsEx[5]=0xffff;
	
	Delay_sec(1);
	VirtualBits=VirtualBitsEx[1]=VirtualBitsEx[3]=VirtualBitsEx[5]=0;
	
	Delay_sec(1);

	int i,k=0;
	for(;;)
	{
		k=1-k;
		for (i=1056+128+15; i>=1056+128;i--)
		{
			Delay_sec(TT);
			SetStateBit(i,k);
		}
		for (i=1056+64+15; i>=1056+64;i--)
		{
			Delay_sec(TT);
			SetStateBit(i,k);
		}
		for (i=1056+15; i>=1056;i--)
		{
			Delay_sec(TT);
			SetStateBit(i,k);
		}
		for (i=48+15; i>=48;i--)
		{
			Delay_sec(TT);
			SetStateBit(i,k);
		}
		if (Time_sec() > T0+0.5)
		{
//			TT = TT * .85;
			T0=Time_sec();
		}
	}

}
